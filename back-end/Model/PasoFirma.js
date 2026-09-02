const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PasoFirma = sequelize.define('PasoFirma', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  flujo_id: { type: DataTypes.INTEGER, allowNull: false },
  orden: { type: DataTypes.INTEGER, allowNull: false },
  rol_id: { type: DataTypes.INTEGER, allowNull: true },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'usuarios', key: 'id' },
  },
}, {
  tableName: 'pasos_firma',
  timestamps: true,
});

module.exports = PasoFirma;
