const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Carrera pertenece a una Facultad. Los Directores de Carrera y Docentes se vinculan a ella.
const Carrera = sequelize.define('Carrera', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(200), allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  facultad_id: { type: DataTypes.INTEGER, allowNull: false },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'carreras',
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
});

module.exports = Carrera;
