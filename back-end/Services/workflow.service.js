const { Documento, Usuario, Rol, FlujoFirma, PasoFirma, Criterio, Indicador, Actividad } = require('../Model');

class WorkflowService {
  /**
   * Determina el siguiente firmante y estado según el estado actual del documento.
   */
  async enrutar(documento) {
    if (!documento.flujo_id) throw new Error('El documento no tiene un flujo de firma asignado');

    const flujo = await FlujoFirma.findByPk(documento.flujo_id, {
      include: [{ model: PasoFirma, as: 'pasos', include: [{ model: Rol, as: 'rolRequerido' }] }],
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
    if (!pasoRequerido.rolRequerido) {
      throw new Error(`El paso ${pasoRequerido.orden} no tiene un rol válido asignado`);
    }

    const firmante = await this._buscarFirmante(pasoRequerido.rol_id, documento.facultad_id);
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
      // Buscar Criterio -> Indicador -> Actividad
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

      // Si no hay flujo en el Criterio, usar el global
      if (!flujoId) {
        const global = await FlujoFirma.findOne({ where: { es_global: true } });
        if (!global) throw new Error('No existe flujo global de firmas configurado');
        flujoId = global.id;
      }

      await documento.update({ flujo_id: flujoId, paso_actual: 1, estado: 'PENDIENTE' });
      documento.flujo_id = flujoId;
      documento.paso_actual = 1;
    }

    const enrutamiento = await this.enrutar(documento);
    if (!enrutamiento || !enrutamiento.firmante) {
      throw new Error('No se encontró firmante inicial para este documento');
    }

    await documento.update({ firmante_actual_id: enrutamiento.firmante.id, estado: 'PENDIENTE' });
    return enrutamiento.firmante;
  }

  /**
   * Busca el firmante con el rol_id indicado.
   * Prioridad: 1) mismo rol + misma facultad, 2) mismo rol sin filtro.
   */
  async _buscarFirmante(rol_id, facultad_id) {
    if (facultad_id) {
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
