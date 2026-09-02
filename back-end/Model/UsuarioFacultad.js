const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Tabla pivote M:N: un Docente/Usuario puede estar asignado a múltiples facultades
const UsuarioFacultad = sequelize.define('UsuarioFacultad', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false },
  facultad_id: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'usuario_facultades',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['usuario_id', 'facultad_id'] },
  ],
});

module.exports = UsuarioFacultad;
