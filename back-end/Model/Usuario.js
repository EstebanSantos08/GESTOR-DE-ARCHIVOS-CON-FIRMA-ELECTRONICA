const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Usuarios autenticables del sistema. El password siempre se guarda como hash.
const Usuario = sequelize.define('Usuario', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(150), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  rol_id: { type: DataTypes.INTEGER, allowNull: false },
  facultad_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Facultad a la que pertenece el usuario (null para RECTOR/ADMIN)',
  },
  carrera_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Carrera asignada (para DIRECTOR_CARRERA y DOCENTE)',
  },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
  reset_token: { type: DataTypes.STRING(255), allowNull: true },
  reset_token_exp: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'usuarios',
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
});

module.exports = Usuario;
