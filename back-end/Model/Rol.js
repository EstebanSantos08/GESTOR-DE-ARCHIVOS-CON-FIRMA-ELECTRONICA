const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Roles jerárquicos del flujo: DOCENTE < DECANO < RECTOR.
const Rol = sequelize.define('Rol', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: {
    type: DataTypes.ENUM('DOCENTE', 'DECANO', 'RECTOR'),
    allowNull: false,
  },
  nivel: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '1=DOCENTE, 2=DECANO, 3=RECTOR',
  },
  descripcion: { type: DataTypes.STRING(255) },
}, {
  tableName: 'roles',
  timestamps: false,
  indexes: [{ unique: true, fields: ['nombre'] }],
});

module.exports = Rol;
