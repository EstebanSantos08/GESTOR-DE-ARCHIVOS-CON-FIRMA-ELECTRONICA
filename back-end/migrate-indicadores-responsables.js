require('dotenv').config();
const { sequelize } = require('./Model');

async function migrate() {
  try {
    console.log('Iniciando migración: Tabla indicadores_responsables...');
    await sequelize.sync({ alter: true });
    console.log('Migración completada con éxito.');
    process.exit(0);
  } catch (err) {
    console.error('Error durante la migración:', err);
    process.exit(1);
  }
}

migrate();
