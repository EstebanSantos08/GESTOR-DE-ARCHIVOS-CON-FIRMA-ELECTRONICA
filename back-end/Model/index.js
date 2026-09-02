const sequelize = require('../config/database');
const Rol = require('./Rol');
const Usuario = require('./Usuario');
const Universidad = require('./Universidad');
const Facultad = require('./Facultad');
const Carrera = require('./Carrera');
const Periodo = require('./Periodo');
const Criterio = require('./Criterio');
const Indicador = require('./Indicador');
const Actividad = require('./Actividad');
const Documento = require('./Documento');
const UsuarioRol = require('./UsuarioRol');
const UsuarioCarrera = require('./UsuarioCarrera');
const FlujoFirma = require('./FlujoFirma');
const PasoFirma = require('./PasoFirma');
const UsuarioFacultad = require('./UsuarioFacultad');
const UsuarioActividad = require('./UsuarioActividad');

// ─── Usuario ↔ Rol ──────────────────────────────────────────────────────────
Usuario.belongsToMany(Rol, { through: UsuarioRol, as: 'roles', foreignKey: 'usuario_id' });
Rol.belongsToMany(Usuario, { through: UsuarioRol, as: 'usuarios', foreignKey: 'rol_id' });

// ─── Usuario ↔ Facultad (N:M) ──────────────────────────────────────────────
Usuario.belongsToMany(Facultad, { through: UsuarioFacultad, as: 'facultades', foreignKey: 'usuario_id', otherKey: 'facultad_id' });
Facultad.belongsToMany(Usuario, { through: UsuarioFacultad, as: 'usuarios', foreignKey: 'facultad_id', otherKey: 'usuario_id' });

// Relación directa 1:N conservada para retrocompatibilidad con columna facultad_id
Usuario.belongsTo(Facultad, { foreignKey: 'facultad_id', as: 'facultad' });
Facultad.hasMany(Usuario, { foreignKey: 'facultad_id', as: 'usuariosDirectos' });

// ─── Usuario ↔ Actividad (N:M) ─────────────────────────────────────────────
Usuario.belongsToMany(Actividad, { through: UsuarioActividad, as: 'actividades', foreignKey: 'usuario_id', otherKey: 'actividad_id' });
Actividad.belongsToMany(Usuario, { through: UsuarioActividad, as: 'usuarios', foreignKey: 'actividad_id', otherKey: 'usuario_id' });

// ─── Usuario ↔ Carrera (M:N) ────────────────────────────────────────────────
// Un usuario puede estar asignado a múltiples carreras y una carrera tiene
// múltiples usuarios (docentes, directores, responsables). La FK directa
// carrera_id fue eliminada del modelo Usuario en favor de esta tabla pivote.
Usuario.belongsToMany(Carrera, { through: UsuarioCarrera, as: 'carreras', foreignKey: 'usuario_id' });
Carrera.belongsToMany(Usuario, { through: UsuarioCarrera, as: 'usuarios', foreignKey: 'carrera_id' });

// ─── Jerarquía: Universidad → Facultad → Carrera → Período → Criterio → Indicador → Actividad
Facultad.belongsTo(Universidad, { foreignKey: 'universidad_id', as: 'universidad' });
Universidad.hasMany(Facultad, { foreignKey: 'universidad_id', as: 'facultades' });

Carrera.belongsTo(Facultad, { foreignKey: 'facultad_id', as: 'facultad' });
Facultad.hasMany(Carrera, { foreignKey: 'facultad_id', as: 'carreras' });

Periodo.belongsTo(Carrera, { foreignKey: 'carrera_id', as: 'carrera' });
Carrera.hasMany(Periodo, { foreignKey: 'carrera_id', as: 'periodos' });

Criterio.belongsTo(Periodo, { foreignKey: 'periodo_id', as: 'periodo' });
Periodo.hasMany(Criterio, { foreignKey: 'periodo_id', as: 'criterios' });

Indicador.belongsTo(Criterio, { foreignKey: 'criterio_id', as: 'criterio' });
Criterio.hasMany(Indicador, { foreignKey: 'criterio_id', as: 'indicadores' });

// ─── Indicador ↔ Responsable (Usuario) ──────────────────────────────────────
Indicador.belongsToMany(Usuario, { through: 'indicadores_responsables', as: 'responsables', foreignKey: 'indicador_id' });
Usuario.belongsToMany(Indicador, { through: 'indicadores_responsables', as: 'indicadoresAsignados', foreignKey: 'usuario_id' });

// ─── Actividad ahora cuelga de Indicador (antes de Criterio) ────────────────
Actividad.belongsTo(Indicador, { foreignKey: 'indicador_id', as: 'indicador' });
Indicador.hasMany(Actividad, { foreignKey: 'indicador_id', as: 'actividades' });

// ─── Actividad ↔ Usuario (Restricción de Carpetas) ──────────────────────────
Actividad.belongsToMany(Usuario, { through: 'actividades_usuarios', as: 'usuariosAsignados', foreignKey: 'actividad_id' });
Usuario.belongsToMany(Actividad, { through: 'actividades_usuarios', as: 'actividadesAsignadas', foreignKey: 'usuario_id' });

// ─── Documento ──────────────────────────────────────────────────────────────
Documento.belongsTo(Usuario, { foreignKey: 'subido_por_id', as: 'subidoPor' });
Documento.belongsTo(Usuario, { foreignKey: 'firmante_actual_id', as: 'firmanteActual' });
Documento.belongsTo(Facultad, { foreignKey: 'facultad_id', as: 'facultad' });
Documento.belongsTo(Actividad, { foreignKey: 'actividad_id', as: 'actividad' });
Actividad.hasMany(Documento, { foreignKey: 'actividad_id', as: 'documentos' });

// ─── Flujo de Firma Dinámico ────────────────────────────────────────────────
FlujoFirma.hasMany(PasoFirma, { foreignKey: 'flujo_id', as: 'pasos' });
PasoFirma.belongsTo(FlujoFirma, { foreignKey: 'flujo_id', as: 'flujo' });

PasoFirma.belongsTo(Rol, { foreignKey: 'rol_id', as: 'rolRequerido' });
Rol.hasMany(PasoFirma, { foreignKey: 'rol_id', as: 'pasosAsignados' });

PasoFirma.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuarioFirmante' });
Usuario.hasMany(PasoFirma, { foreignKey: 'usuario_id', as: 'pasosFirma' });

Criterio.belongsTo(FlujoFirma, { foreignKey: 'flujo_id', as: 'flujoFirma' });
FlujoFirma.hasMany(Criterio, { foreignKey: 'flujo_id', as: 'criterios' });

Documento.belongsTo(FlujoFirma, { foreignKey: 'flujo_id', as: 'flujoFirma' });
FlujoFirma.hasMany(Documento, { foreignKey: 'flujo_id', as: 'documentos' });

module.exports = {
  sequelize,
  Rol,
  Usuario,
  UsuarioRol,
  UsuarioCarrera,
  Universidad,
  Facultad,
  Carrera,
  Periodo,
  Criterio,
  Indicador,
  Actividad,
  Documento,
  FlujoFirma,
  PasoFirma,
  UsuarioFacultad,
  UsuarioActividad,
};

