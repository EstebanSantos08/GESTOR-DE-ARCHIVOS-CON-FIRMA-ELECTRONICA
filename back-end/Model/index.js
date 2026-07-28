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

// ─── Usuario ↔ Rol ──────────────────────────────────────────────────────────
Usuario.belongsTo(Rol, { foreignKey: 'rol_id', as: 'rol' });
Rol.hasMany(Usuario, { foreignKey: 'rol_id', as: 'usuarios' });

// ─── Usuario ↔ Facultad ─────────────────────────────────────────────────────
Usuario.belongsTo(Facultad, { foreignKey: 'facultad_id', as: 'facultad' });
Facultad.hasMany(Usuario, { foreignKey: 'facultad_id', as: 'usuarios' });

// ─── Usuario ↔ Carrera ──────────────────────────────────────────────────────
Usuario.belongsTo(Carrera, { foreignKey: 'carrera_id', as: 'carrera' });
Carrera.hasMany(Usuario, { foreignKey: 'carrera_id', as: 'usuarios' });

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
Indicador.belongsTo(Usuario, { foreignKey: 'responsable_id', as: 'responsable' });
Usuario.hasMany(Indicador, { foreignKey: 'responsable_id', as: 'indicadoresAsignados' });

// ─── Actividad ahora cuelga de Indicador (antes de Criterio) ────────────────
Actividad.belongsTo(Indicador, { foreignKey: 'indicador_id', as: 'indicador' });
Indicador.hasMany(Actividad, { foreignKey: 'indicador_id', as: 'actividades' });

// ─── Documento ──────────────────────────────────────────────────────────────
Documento.belongsTo(Usuario, { foreignKey: 'subido_por_id', as: 'subidoPor' });
Documento.belongsTo(Usuario, { foreignKey: 'firmante_actual_id', as: 'firmanteActual' });
Documento.belongsTo(Facultad, { foreignKey: 'facultad_id', as: 'facultad' });
Documento.belongsTo(Actividad, { foreignKey: 'actividad_id', as: 'actividad' });

module.exports = {
  sequelize,
  Rol,
  Usuario,
  Universidad,
  Facultad,
  Carrera,
  Periodo,
  Criterio,
  Indicador,
  Actividad,
  Documento,
};

