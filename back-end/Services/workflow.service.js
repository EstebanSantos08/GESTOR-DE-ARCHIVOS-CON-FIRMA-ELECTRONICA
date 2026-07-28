const { Documento, Usuario, Rol } = require('../Model');

/**
 * Workflow de firma de 4 pasos:
 *
 * PENDIENTE ─→ DIRECTOR_CARRERA firma ─→ FIRMADO_DIRECTOR
 *          ─→ SUBDECANO firma       ─→ FIRMADO_SUBDECANO
 *          ─→ DECANO firma          ─→ FIRMADO_DECANO
 *          ─→ RECTOR firma          ─→ COMPLETADO
 *
 * En cualquier paso, el firmante puede RECHAZAR → RECHAZADO.
 */
const FLUJO = {
  PENDIENTE:          { siguienteRol: 'DIRECTOR_CARRERA', estadoSiguiente: 'FIRMADO_DIRECTOR',  timestampField: 'firmado_director_en' },
  FIRMADO_DIRECTOR:   { siguienteRol: 'SUBDECANO',        estadoSiguiente: 'FIRMADO_SUBDECANO', timestampField: 'firmado_subdecano_en' },
  FIRMADO_SUBDECANO:  { siguienteRol: 'DECANO',           estadoSiguiente: 'FIRMADO_DECANO',    timestampField: 'firmado_decano_en' },
  FIRMADO_DECANO:     { siguienteRol: 'RECTOR',           estadoSiguiente: 'COMPLETADO',        timestampField: 'firmado_rector_en' },
  COMPLETADO:         null,
  RECHAZADO:          null,
};

class WorkflowService {
  /**
   * Determina el siguiente firmante y estado según el estado actual del documento.
   */
  async enrutar(documento) {
    const etapa = FLUJO[documento.estado];
    if (!etapa) return null;

    const rol = await Rol.findOne({ where: { nombre: etapa.siguienteRol } });
    if (!rol) throw new Error(`Rol ${etapa.siguienteRol} no existe en BD`);

    const firmante = await this._buscarFirmante(rol.id, documento.facultad_id);
    return { firmante, estadoSiguiente: etapa.estadoSiguiente, timestampField: etapa.timestampField };
  }

  /**
   * Procesa la firma de un documento: valida permisos, marca timestamp,
   * avanza el estado y asigna al siguiente firmante.
   */
  async procesarFirma(documentoId, usuarioFirmante, observaciones = null) {
    const documento = await Documento.findByPk(documentoId, {
      include: [{ model: Usuario, as: 'firmanteActual', include: [{ model: Rol, as: 'rol' }] }],
    });

    if (!documento) throw new Error('Documento no encontrado');
    if (documento.estado === 'COMPLETADO') throw new Error('El documento ya está completado');
    if (documento.estado === 'RECHAZADO') throw new Error('El documento fue rechazado');

    // Verifica que quien firma es el firmante asignado
    if (documento.firmante_actual_id !== usuarioFirmante.id) {
      throw new Error('No tiene autorización para firmar este documento en esta etapa');
    }

    const etapa = FLUJO[documento.estado];
    if (!etapa) throw new Error('Estado de documento inválido para firma');

    const actualizacion = {
      estado: etapa.estadoSiguiente,
      observaciones,
    };

    // Marca el timestamp de auditoría de este paso
    actualizacion[etapa.timestampField] = new Date();

    // Si el siguiente estado es COMPLETADO, limpia el firmante actual
    if (etapa.estadoSiguiente === 'COMPLETADO') {
      actualizacion.firmante_actual_id = null;
    } else {
      // Asignar al próximo firmante en la cadena
      const siguiente = await this.enrutar({ ...documento.toJSON(), estado: etapa.estadoSiguiente });
      if (siguiente && siguiente.firmante) {
        actualizacion.firmante_actual_id = siguiente.firmante.id;
      } else {
        throw new Error(`No se encontró un ${FLUJO[etapa.estadoSiguiente]?.siguienteRol || 'firmante'} para continuar el flujo`);
      }
    }

    await documento.update(actualizacion);
    return documento.reload();
  }

  /**
   * Rechaza un documento — solo el firmante actual puede rechazar.
   */
  async rechazar(documentoId, usuarioFirmante, motivo) {
    const documento = await Documento.findByPk(documentoId);
    if (!documento) throw new Error('Documento no encontrado');
    if (documento.firmante_actual_id !== usuarioFirmante.id) {
      throw new Error('No tiene autorización para rechazar este documento');
    }

    await documento.update({ estado: 'RECHAZADO', observaciones: motivo, firmante_actual_id: null });
    return documento.reload();
  }

  /**
   * Asigna al DIRECTOR_CARRERA como primer firmante del documento.
   */
  async asignarFirmanteInicial(documento) {
    const rol = await Rol.findOne({ where: { nombre: 'DIRECTOR_CARRERA' } });
    if (!rol) throw new Error('Rol DIRECTOR_CARRERA no configurado');

    const firmante = await this._buscarFirmante(rol.id, documento.facultad_id);
    if (!firmante) throw new Error('No hay ningún Director de Carrera registrado en el sistema');

    await documento.update({ firmante_actual_id: firmante.id });
    return firmante;
  }

  /**
   * Busca el firmante con el rol indicado.
   * Prioridad: 1) mismo rol + misma facultad, 2) mismo rol sin filtro.
   */
  async _buscarFirmante(rol_id, facultad_id) {
    if (facultad_id) {
      const conFacultad = await Usuario.findOne({
        where: { rol_id, facultad_id, activo: true },
        include: [{ model: Rol, as: 'rol' }],
      });
      if (conFacultad) return conFacultad;
    }

    return await Usuario.findOne({
      where: { rol_id, activo: true },
      include: [{ model: Rol, as: 'rol' }],
    });
  }
}

module.exports = new WorkflowService();

