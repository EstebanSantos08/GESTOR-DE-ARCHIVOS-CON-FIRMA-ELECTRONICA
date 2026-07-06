const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Actividad parametrizable que cuelga de un criterio y se asocia a documentos.
const Actividad = sequelize.define('Actividad', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(200), allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  criterio_id: { type: DataTypes.INTEGER, allowNull: false },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'actividades',
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
});

module.exports = Actividad;
