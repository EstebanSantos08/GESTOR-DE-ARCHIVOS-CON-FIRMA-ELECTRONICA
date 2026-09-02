const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Tabla pivote M:N: un usuario puede estar asignado a múltiples carreras
// (p.ej. un Docente que enseña en Software y TI, o un Director de varias carreras).
const UsuarioCarrera = sequelize.define('UsuarioCarrera', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false },
  carrera_id: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'usuario_carreras',
  timestamps: false,
  indexes: [
    // Evita duplicar la misma asignación usuario-carrera
    { unique: true, fields: ['usuario_id', 'carrera_id'] },
  ],
});

module.exports = UsuarioCarrera;
