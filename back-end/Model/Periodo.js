const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Período académico que pertenece a una Facultad. Conserva carrera_id por compatibilidad.
const Periodo = sequelize.define('Periodo', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  facultad_id: { type: DataTypes.INTEGER, allowNull: true },
  carrera_id: { type: DataTypes.INTEGER, allowNull: true },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'periodos',
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
});

module.exports = Periodo;

