const { Documento, Usuario, Rol, FlujoFirma, PasoFirma, Criterio, Indicador, Actividad, Facultad } = require('../Model');

class WorkflowService {
  /**
   * Determina el siguiente firmante y estado según el estado actual del documento.
   */
  async enrutar(documento) {
    if (!documento.flujo_id) {
      const global = await this.garantizarFlujoGlobal();
      if (global) {
        documento.flujo_id = global.id;
        if (documento.update) await documento.update({ flujo_id: global.id });
      } else {
        throw new Error('El documento no tiene un flujo de firma asignado');
      }
    }

    let flujo = await FlujoFirma.findByPk(documento.flujo_id, {
      include: [
        {
          model: PasoFirma,
          as: 'pasos',
          include: [
            { model: Rol, as: 'rolRequerido' },
            { model: Usuario, as: 'usuarioFirmante' }
          ]
        }
      ],
      order: [[{ model: PasoFirma, as: 'pasos' }, 'orden', 'ASC']],
    });

    if (!flujo || !flujo.pasos || flujo.pasos.length === 0) {
      const global = await this.garantizarFlujoGlobal();
      if (global && global.pasos && global.pasos.length > 0) {
        documento.flujo_id = global.id;
        if (documento.update) await documento.update({ flujo_id: global.id });
        flujo = global;
      } else {
        throw new Error('El flujo de firma no existe o no tiene pasos definidos');
      }
    }

    const pasoActualIndex = documento.paso_actual - 1;

    // Si ya completó todos los pasos
    if (pasoActualIndex >= flujo.pasos.length) {
      return { firmante: null, estadoSiguiente: 'COMPLETADO' };
    }

    const pasoRequerido = flujo.pasos[pasoActualIndex];
    let firmante = null;

    // 1. Asignación directa si el paso tiene usuario_id configurado
    if (pasoRequerido.usuario_id) {
      firmante = await Usuario.findOne({
        where: { id: pasoRequerido.usuario_id, activo: true },
        include: [{ model: Rol, as: 'roles' }]
      });
    }

    // 2. Fallback estricto: si no hay usuario_id (o no está activo), buscar por rol_id clásico
    if (!firmante) {
      const rolId = pasoRequerido.rol_id || (pasoRequerido.rolRequerido ? pasoRequerido.rolRequerido.id : null);
      if (!rolId) {
        throw new Error(`El paso ${pasoRequerido.orden} no tiene un firmante ni un rol válido asignado`);
      }
      firmante = await this._buscarFirmante(rolId, documento.facultad_id);
    }

    return { firmante, estadoSiguiente: 'EN_REVISION' };
  }

  /**
   * Procesa la firma de un documento: valida permisos, avanza el estado y asigna al siguiente firmante.
   */
  async procesarFirma(documentoId, usuarioFirmante, observaciones = null) {
    const documento = await Documento.findByPk(documentoId);
    if (!documento) throw new Error('Documento no encontrado');
    if (documento.estado === 'COMPLETADO') throw new Error('El documento ya está completado');
    if (documento.estado === 'RECHAZADO') throw new Error('El documento fue rechazado');

    // Verifica que quien firma es el firmante asignado (comparación laxa por posibles diferencias int/string)
    // eslint-disable-next-line eqeqeq
    if (documento.firmante_actual_id != usuarioFirmante.id) {
      throw new Error(`No tiene autorización para firmar este documento en esta etapa. Firmante esperado ID=${documento.firmante_actual_id}, firmante actual ID=${usuarioFirmante.id}`);
    }

    // Avanza el paso
    const nuevoPaso = documento.paso_actual + 1;
    const actualizacion = {
      paso_actual: nuevoPaso,
      observaciones, // Opcional: concatenar o sobrescribir observaciones
    };

    // Determinar siguiente enrutamiento
    const siguiente = await this.enrutar({ ...documento.toJSON(), paso_actual: nuevoPaso });

    if (siguiente.estadoSiguiente === 'COMPLETADO') {
      actualizacion.estado = 'COMPLETADO';
      actualizacion.firmante_actual_id = null;
    } else {
      if (!siguiente.firmante) {
        throw new Error('No se encontró un firmante para el siguiente paso del flujo');
      }
      actualizacion.estado = 'EN_REVISION';
      actualizacion.firmante_actual_id = siguiente.firmante.id;
    }

    await documento.update(actualizacion);
    return documento.reload({
      include: [{ model: Usuario, as: 'firmanteActual' }]
    });
  }

  /**
   * Rechaza un documento — solo el firmante actual puede rechazar.
   */
  async rechazar(documentoId, usuarioFirmante, motivo) {
    const documento = await Documento.findByPk(documentoId);
    if (!documento) throw new Error('Documento no encontrado');
    // eslint-disable-next-line eqeqeq
    if (documento.firmante_actual_id != usuarioFirmante.id) {
      throw new Error('No tiene autorización para rechazar este documento');
    }

    await documento.update({ estado: 'RECHAZADO', observaciones: motivo, firmante_actual_id: null });
    return documento.reload();
  }

  /**
   * Asigna el primer firmante del documento basado en su flujo.
   */
  async asignarFirmanteInicial(documento) {
    let flujoId = documento.flujo_id;

    // Si el documento aún no tiene flujo (ej: recién creado), se determina:
    if (!flujoId) {
      // 1. Buscar en la Actividad -> Indicador -> Criterio
      if (documento.actividad_id) {
        const actividad = await Actividad.findByPk(documento.actividad_id, {
          include: [{
            model: Indicador, as: 'indicador', include: [{
              model: Criterio, as: 'criterio'
            }]
          }]
        });

        if (actividad) {
          if (actividad.flujo_id) {
            flujoId = actividad.flujo_id;
          } else if (actividad.indicador && actividad.indicador.criterio) {
            flujoId = actividad.indicador.criterio.flujo_id;
          }
        }
      }

      // 2. Si no hay flujo en la Actividad ni en el Criterio:
      if (!flujoId) {
        // A) Intentar con el flujo marcado como global
        let flujoGlobal = await FlujoFirma.findOne({
          where: { es_global: true },
          include: [{ model: PasoFirma, as: 'pasos' }],
        });

        // B) Fallback inteligente: Si existe un flujo configurado por el usuario (aunque haya olvidado marcar es_global),
        // adoptarlo como global para no bloquear la producción
        if (!flujoGlobal || !flujoGlobal.pasos || flujoGlobal.pasos.length === 0) {
          const todosFlujos = await FlujoFirma.findAll({
            include: [{ model: PasoFirma, as: 'pasos' }],
            order: [['id', 'ASC']],
          });
          const conPasos = todosFlujos.find(f => f.pasos && f.pasos.length > 0);
          if (conPasos) {
            flujoGlobal = conPasos;
            await flujoGlobal.update({ es_global: true });
          }
        }

        // C) Fallback de rescate: Si la base de datos no tiene ningún flujo, garantizar el institucional por defecto
        if (!flujoGlobal) {
          flujoGlobal = await this.garantizarFlujoGlobal();
        }

        flujoId = flujoGlobal.id;
      }

      await documento.update({ flujo_id: flujoId, paso_actual: 1, estado: 'PENDIENTE' });
      documento.flujo_id = flujoId;
      documento.paso_actual = 1;
    }

    const enrutamiento = await this.enrutar(documento);
    if (!enrutamiento || !enrutamiento.firmante) {
      throw new Error('No se encontró firmante inicial para este documento. Asegúrese de que el primer paso del flujo tenga un usuario asignado o exista un usuario activo con el rol correspondiente.');
    }

    await documento.update({ firmante_actual_id: enrutamiento.firmante.id, estado: 'PENDIENTE' });
    return enrutamiento.firmante;
  }

  /**
   * Garantiza que exista al menos un Flujo Global con pasos válidos en el sistema.
   * Si no existe, lo crea automáticamente basándose en los roles institucionales disponibles.
   */
  async garantizarFlujoGlobal() {
    let global = await FlujoFirma.findOne({
      where: { es_global: true },
      include: [{ model: PasoFirma, as: 'pasos' }],
    });

    if (global && global.pasos && global.pasos.length > 0) {
      return global;
    }

    const primerFlujo = await FlujoFirma.findOne({
      include: [{ model: PasoFirma, as: 'pasos' }],
      order: [['id', 'ASC']],
    });

    if (primerFlujo && primerFlujo.pasos && primerFlujo.pasos.length > 0) {
      await primerFlujo.update({ es_global: true });
      return primerFlujo;
    }

    // Crear flujo institucional por defecto
    const nuevoFlujo = await FlujoFirma.create({
      nombre: 'Flujo Institucional Predeterminado',
      es_global: true,
    });

    // Asignar los roles estándar
    const rolesNombres = ['DIRECTOR_CARRERA', 'SUBDECANO', 'DECANO', 'RECTOR'];
    const rolesDB = await Rol.findAll({
      where: { nombre: rolesNombres },
    });

    const rolesMap = {};
    rolesDB.forEach(r => { rolesMap[r.nombre] = r.id; });

    const pasosACrear = [];
    let orden = 1;
    for (const nom of rolesNombres) {
      if (rolesMap[nom]) {
        pasosACrear.push({
          flujo_id: nuevoFlujo.id,
          orden: orden++,
          rol_id: rolesMap[nom],
          usuario_id: null,
        });
      }
    }

    if (pasosACrear.length === 0) {
      const todosRoles = await Rol.findAll({ limit: 4, order: [['nivel', 'ASC']] });
      todosRoles.forEach((r, idx) => {
        pasosACrear.push({
          flujo_id: nuevoFlujo.id,
          orden: idx + 1,
          rol_id: r.id,
          usuario_id: null,
        });
      });
    }

    if (pasosACrear.length > 0) {
      await PasoFirma.bulkCreate(pasosACrear);
    }

    return await FlujoFirma.findByPk(nuevoFlujo.id, {
      include: [{ model: PasoFirma, as: 'pasos' }],
    });
  }

  /**
   * Busca el firmante con el rol_id indicado.
   * Prioridad: 1) mismo rol + misma facultad (M:N), 2) mismo rol + facultad (1:N), 3) mismo rol sin filtro, 4) por nombre de rol.
   */
  async _buscarFirmante(rol_id, facultad_id) {
    if (facultad_id) {
      // 1. Mismo rol + misma facultad (relación M:N)
      const conFacultadMN = await Usuario.findOne({
        where: { activo: true },
        include: [
          {
            model: Rol,
            as: 'roles',
            where: { id: rol_id }
          },
          {
            model: Facultad,
            as: 'facultades',
            where: { id: facultad_id }
          }
        ],
      });
      if (conFacultadMN) return conFacultadMN;

      // 2. Mismo rol + misma facultad (campo escalar legacy)
      const conFacultad = await Usuario.findOne({
        where: { facultad_id, activo: true },
        include: [{
          model: Rol,
          as: 'roles',
          where: { id: rol_id }
        }],
      });
      if (conFacultad) return conFacultad;
    }

    // 3. Fallback: mismo rol sin filtro de facultad
    const sinFacultad = await Usuario.findOne({
      where: { activo: true },
      include: [{
        model: Rol,
        as: 'roles',
        where: { id: rol_id }
      }],
    });
    if (sinFacultad) return sinFacultad;

    // 4. Fallback de rescate para producción: buscar cualquier usuario activo con ese rol por nombre si rol_id vino desfasado
    const rolObj = await Rol.findByPk(rol_id);
    if (rolObj) {
      const porNombre = await Usuario.findOne({
        where: { activo: true },
        include: [{
          model: Rol,
          as: 'roles',
          where: { nombre: rolObj.nombre }
        }],
      });
      if (porNombre) return porNombre;
    }

    return null;
  }
}

module.exports = new WorkflowService();
