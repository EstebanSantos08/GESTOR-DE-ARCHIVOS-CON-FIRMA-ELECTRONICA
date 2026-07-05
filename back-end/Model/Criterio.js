const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Criterio de clasificación para agrupar actividades parametrizables.
const Criterio = sequelize.define('Criterio', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(200), allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'criterios',
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
});

module.exports = Criterio;
