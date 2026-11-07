const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Carpeta dentro de un Subcriterio donde se almacenan los documentos PDF.
// Solo el Administrador puede crear, editar o eliminar carpetas.
const Carpeta = sequelize.define('Carpeta', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(200), allowNull: false },
  descripcion: { type: DataTypes.TEXT, allowNull: true },
  subcriterio_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Subcriterio al que pertenece la carpeta',
  },
  creado_por_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Usuario administrador que creó la carpeta',
  },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'carpetas',
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
});

module.exports = Carpeta;
