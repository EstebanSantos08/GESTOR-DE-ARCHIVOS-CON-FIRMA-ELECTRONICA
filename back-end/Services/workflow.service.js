const { Documento, Usuario, Rol } = require('../Model');

// Jerarquía de firma: DOCENTE sube → DECANO firma → RECTOR firma → COMPLETADO
// El mapa define el siguiente paso y el estado resultante para cada etapa.
const FLUJO = {
  PENDIENTE:     { siguienteRol: 'DECANO',  estadoSiguiente: 'FIRMADO_DECANO' },
  FIRMADO_DECANO: { siguienteRol: 'RECTOR', estadoSiguiente: 'COMPLETADO' },
  COMPLETADO:    null,
  RECHAZADO:     null,
};

class WorkflowService {
  async enrutar(documento) {
    // Convierte el estado actual en el siguiente firmante y el próximo estado.
    const etapa = FLUJO[documento.estado];
    if (!etapa) return null;

    const rol = await Rol.findOne({ where: { nombre: etapa.siguienteRol } });
    if (!rol) throw new Error(`Rol ${etapa.siguienteRol} no existe en BD`);

        // Busca el firmante del mismo rol — si aplica, primero filtra por facultad
    const firmante = await this._buscarFirmante(rol.id, documento.facultad_id);
    return { firmante, estadoSiguiente: etapa.estadoSiguiente };
  }

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

    // Se marca la fecha exacta de firma para auditoría del flujo.
    if (etapa.estadoSiguiente === 'FIRMADO_DECANO') {
      actualizacion.firmado_decano_en = new Date();
    } else if (etapa.estadoSiguiente === 'COMPLETADO') {
      actualizacion.firmado_rector_en = new Date();
      actualizacion.firmante_actual_id = null;
    }

    // Si hay siguiente paso, asignar próximo firmante
    if (etapa.estadoSiguiente !== 'COMPLETADO') {
      const siguiente = await this.enrutar({ ...documento.toJSON(), estado: etapa.estadoSiguiente });
      if (siguiente && siguiente.firmante) {
        actualizacion.firmante_actual_id = siguiente.firmante.id;
      }
    }

    await documento.update(actualizacion);
    return documento.reload();
  }

  async rechazar(documentoId, usuarioFirmante, motivo) {
    const documento = await Documento.findByPk(documentoId);
    if (!documento) throw new Error('Documento no encontrado');
    if (documento.firmante_actual_id !== usuarioFirmante.id) {
      throw new Error('No tiene autorización para rechazar este documento');
    }

    await documento.update({ estado: 'RECHAZADO', observaciones: motivo, firmante_actual_id: null });
    return documento.reload();
  }

  async asignarFirmanteInicial(documento) {
    const rol = await Rol.findOne({ where: { nombre: 'DECANO' } });
    if (!rol) throw new Error('Rol DECANO no configurado');

    const firmante = await this._buscarFirmante(rol.id, documento.facultad_id);
    if (!firmante) throw new Error('No hay ningún Decano registrado en el sistema');

    await documento.update({ firmante_actual_id: firmante.id });
    return firmante;
  }

  async _buscarFirmante(rol_id, facultad_id) {
    // Si hay facultad, busca primero un usuario con ese rol asignado a esa facultad.
    // Si no encuentra, fallback a cualquier usuario con ese rol.
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
