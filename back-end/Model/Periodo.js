const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Período académico que ahora pertenece a una Carrera (antes a Facultad).
const Periodo = sequelize.define('Periodo', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  carrera_id: { type: DataTypes.INTEGER, allowNull: false },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'periodos',
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
});

module.exports = Periodo;

