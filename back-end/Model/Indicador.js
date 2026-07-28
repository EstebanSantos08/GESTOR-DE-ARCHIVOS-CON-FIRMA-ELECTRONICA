const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Indicador de acreditación (31 en total, agrupados bajo 5 criterios).
// Cada indicador tiene un responsable asignado que sube/revisa la evidencia.
const Indicador = sequelize.define('Indicador', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  numero: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Número del indicador (1-31)',
  },
  nombre: { type: DataTypes.STRING(300), allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  criterio_id: { type: DataTypes.INTEGER, allowNull: false },
  responsable_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Usuario responsable de este indicador',
  },
  responsable_nombre: {
    type: DataTypes.STRING(300),
    allowNull: true,
    comment: 'Texto con el nombre o cargo del responsable (e.g. "Directores de Carrera")',
  },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'indicadores',
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
});

module.exports = Indicador;
