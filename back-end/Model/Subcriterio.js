const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Subcriterio de acreditación (31 en total, antes llamados Indicadores, agrupados bajo 5 criterios).
// Cada subcriterio tiene un responsable asignado que sube/revisa la evidencia.
const Subcriterio = sequelize.define('Subcriterio', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  numero: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Número del subcriterio (1-31)',
  },
  nombre: { type: DataTypes.STRING(300), allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  criterio_id: { type: DataTypes.INTEGER, allowNull: false },
  responsable_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Usuario responsable de este subcriterio',
  },
  responsable_nombre: {
    type: DataTypes.STRING(300),
    allowNull: true,
    comment: 'Texto con el nombre o cargo del responsable (e.g. "Directores de Carrera")',
  },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'subcriterios',
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
});

module.exports = Subcriterio;
