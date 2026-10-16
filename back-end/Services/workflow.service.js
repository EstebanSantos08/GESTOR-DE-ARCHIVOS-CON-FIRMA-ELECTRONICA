const { Documento, Usuario, Rol, FlujoFirma, PasoFirma, Criterio, Indicador, Actividad, Facultad } = require('../Model');

class WorkflowService {
  /**
   * Determina el siguiente firmante y estado según el estado actual del documento.
   */
  async enrutar(documento) {
    if (!documento.flujo_id) throw new Error('El documento no tiene un flujo de firma asignado');

    const flujo = await FlujoFirma.findByPk(documento.flujo_id, {
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
      throw new Error('El flujo de firma no existe o no tiene pasos definidos');
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
   * Soporta transacciones de Sequelize para atomicidad.
   */
  async procesarFirma(documentoId, usuarioFirmante, observaciones = null, options = {}) {
    const tx = options.transaction;
    const findOpts = tx ? { transaction: tx } : undefined;
    const documento = await Documento.findByPk(documentoId, findOpts);
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

    if (tx) {
      await documento.update(actualizacion, { transaction: tx });
      return documento.reload({
        include: [{ model: Usuario, as: 'firmanteActual' }],
        transaction: tx,
      });
    }

    await documento.update(actualizacion);
    return documento.reload({
      include: [{ model: Usuario, as: 'firmanteActual' }]
    });
  }

  /**
   * Rechaza un documento — solo el firmante actual puede rechazar.
   */
  async rechazar(documentoId, usuarioFirmante, motivo, options = {}) {
    const tx = options.transaction;
    const findOpts = tx ? { transaction: tx } : undefined;
    const documento = await Documento.findByPk(documentoId, findOpts);
    if (!documento) throw new Error('Documento no encontrado');
    // eslint-disable-next-line eqeqeq
    if (documento.firmante_actual_id != usuarioFirmante.id) {
      throw new Error('No tiene autorización para rechazar este documento');
    }

    const payload = { estado: 'RECHAZADO', observaciones: motivo, firmante_actual_id: null };
    if (tx) {
      await documento.update(payload, { transaction: tx });
      return documento.reload({ transaction: tx });
    }

    await documento.update(payload);
    return documento.reload();
  }

  /**
   * Asigna el primer firmante del documento basado en su flujo.
   */
  async asignarFirmanteInicial(documento, options = {}) {
    const tx = options.transaction;
    const queryOpts = tx ? { transaction: tx } : {};
    let flujoId = documento.flujo_id;

    // Si el documento aún no tiene flujo (ej: recién creado), se determina:
    if (!flujoId) {
      // Buscar Criterio -> Indicador -> Actividad
      const actividad = await Actividad.findByPk(documento.actividad_id, {
        include: [{
          model: Indicador, as: 'indicador', include: [{
            model: Criterio, as: 'criterio'
          }]
        }],
        ...queryOpts,
      });

      if (actividad) {
        if (actividad.flujo_id) {
          flujoId = actividad.flujo_id;
        } else if (actividad.indicador && actividad.indicador.criterio) {
          flujoId = actividad.indicador.criterio.flujo_id;
        }
      }

      // Si no hay flujo en el Criterio ni Actividad, usar el global
      if (!flujoId) {
        const global = await FlujoFirma.findOne({ where: { es_global: true }, ...queryOpts });
        if (!global) throw new Error('No existe flujo global de firmas configurado');
        flujoId = global.id;
      }

      if (tx) {
        await documento.update({ flujo_id: flujoId, paso_actual: 1, estado: 'PENDIENTE' }, { transaction: tx });
      } else {
        await documento.update({ flujo_id: flujoId, paso_actual: 1, estado: 'PENDIENTE' });
      }
      documento.flujo_id = flujoId;
      documento.paso_actual = 1;
    }

    const enrutamiento = await this.enrutar(documento);
    if (!enrutamiento || !enrutamiento.firmante) {
      throw new Error('No se encontró firmante inicial para este documento');
    }

    if (tx) {
      await documento.update({ firmante_actual_id: enrutamiento.firmante.id, estado: 'PENDIENTE' }, { transaction: tx });
    } else {
      await documento.update({ firmante_actual_id: enrutamiento.firmante.id, estado: 'PENDIENTE' });
    }
    return enrutamiento.firmante;
  }

  /**
   * Obtiene la lista completa de firmantes planificados en el flujo asignado al documento.
   * Útil para generar los sellos visuales antes de la primera firma en prepararDocumento.
   */
  async obtenerFirmantesProgramados(documento) {
    if (!documento.flujo_id) return [];

    const flujo = await FlujoFirma.findByPk(documento.flujo_id, {
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

    if (!flujo || !flujo.pasos) return [];

    const firmantes = [];
    for (const paso of flujo.pasos) {
      let nombre = paso.usuarioFirmante?.nombre;
      const rol = paso.rolRequerido?.nombre || 'Firmante';

      if (!nombre && paso.rol_id) {
        const u = await this._buscarFirmante(paso.rol_id, documento.facultad_id);
        if (u) nombre = u.nombre;
      }

      firmantes.push({
        nombre: nombre || 'Pendiente',
        rol: rol,
      });
    }

    return firmantes;
  }

  /**
   * Busca el firmante con el rol_id indicado.
   * Prioridad: 1) mismo rol + misma facultad, 2) mismo rol sin filtro.
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

    return await Usuario.findOne({
      where: { activo: true },
      include: [{
        model: Rol,
        as: 'roles',
        where: { id: rol_id }
      }],
    });
  }
}

module.exports = new WorkflowService();
