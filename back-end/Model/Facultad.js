const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Cada facultad pertenece a una universidad y se usa para enrutar firmas.
const Facultad = sequelize.define('Facultad', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(200), allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  universidad_id: { type: DataTypes.INTEGER, allowNull: false },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'facultades',
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
});

module.exports = Facultad;
