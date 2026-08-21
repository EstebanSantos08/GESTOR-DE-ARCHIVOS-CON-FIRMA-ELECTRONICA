const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UsuarioRol = sequelize.define('UsuarioRol', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false },
  rol_id: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'usuario_roles',
  timestamps: false,
});

module.exports = UsuarioRol;
