const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FlujoFirma = sequelize.define('FlujoFirma', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(255), allowNull: false },
  es_global: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'flujos_firma',
  timestamps: true,
});

module.exports = FlujoFirma;
