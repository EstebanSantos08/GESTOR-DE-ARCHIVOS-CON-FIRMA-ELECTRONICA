const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Catálogo base de universidades para parametrizar facultades y documentos.
const Universidad = sequelize.define('Universidad', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(200), allowNull: false, unique: true },
  descripcion: { type: DataTypes.TEXT },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'universidades',
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
});

module.exports = Universidad;
