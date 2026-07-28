const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Roles jerárquicos del flujo de acreditación:
// RESPONSABLE_AREA(1) < DOCENTE(2) < DIRECTOR_CARRERA(3) < SUBDECANO(4) < DECANO(5) < RECTOR(6) < ADMINISTRADOR(7)
const Rol = sequelize.define('Rol', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: {
    type: DataTypes.ENUM(
      'RESPONSABLE_AREA',
      'DOCENTE',
      'DIRECTOR_CARRERA',
      'SUBDECANO',
      'DECANO',
      'RECTOR',
      'ADMINISTRADOR'
    ),
    allowNull: false,
  },
  nivel: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '1=RESP_AREA, 2=DOCENTE, 3=DIR_CARRERA, 4=SUBDECANO, 5=DECANO, 6=RECTOR, 7=ADMIN',
  },
  descripcion: { type: DataTypes.STRING(255) },
}, {
  tableName: 'roles',
  timestamps: false,
  indexes: [{ unique: true, fields: ['nombre'] }],
});

module.exports = Rol;
