const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Estados del workflow de firma de 4 pasos:
// PENDIENTE → FIRMADO_DIRECTOR → FIRMADO_SUBDECANO → FIRMADO_DECANO → COMPLETADO
// En cualquier punto puede pasar a RECHAZADO.
const ESTADOS = [
  'PENDIENTE',
  'FIRMADO_DIRECTOR',
  'FIRMADO_SUBDECANO',
  'FIRMADO_DECANO',
  'COMPLETADO',
  'RECHAZADO',
];

const Documento = sequelize.define('Documento', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre_original: { type: DataTypes.STRING(255), allowNull: false },
  ruta_archivo: { type: DataTypes.STRING(500), allowNull: false },
  estado: {
    type: DataTypes.ENUM(...ESTADOS),
    defaultValue: 'PENDIENTE',
  },
  subido_por_id: { type: DataTypes.INTEGER, allowNull: false },
  firmante_actual_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID del usuario que debe firmar a continuación',
  },
  facultad_id: { type: DataTypes.INTEGER, allowNull: true },
  actividad_id: { type: DataTypes.INTEGER, allowNull: true },
  observaciones: { type: DataTypes.TEXT, allowNull: true },
  hash_sha256: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: 'Hash del archivo en el momento de subida',
  },
  // Timestamps de auditoría — cada paso de firma se marca
  firmado_director_en: { type: DataTypes.DATE, allowNull: true },
  firmado_subdecano_en: { type: DataTypes.DATE, allowNull: true },
  firmado_decano_en: { type: DataTypes.DATE, allowNull: true },
  firmado_rector_en: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'documentos',
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
});

Documento.ESTADOS = ESTADOS;

module.exports = Documento;

