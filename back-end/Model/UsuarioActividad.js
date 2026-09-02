const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Tabla pivote M:N: un Docente/Usuario puede estar asignado a múltiples actividades
const UsuarioActividad = sequelize.define('UsuarioActividad', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false },
  actividad_id: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'usuario_actividades',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['usuario_id', 'actividad_id'] },
  ],
});

module.exports = UsuarioActividad;
