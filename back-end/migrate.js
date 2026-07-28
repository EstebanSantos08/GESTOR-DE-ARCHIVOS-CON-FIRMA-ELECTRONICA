require('dotenv').config();
const sequelize = require('./config/database');
const { QueryTypes } = require('sequelize');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');

    // Add column si no existe
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='indicadores' and column_name='responsable_nombre'
    `);

    if (results.length === 0) {
      await sequelize.query('ALTER TABLE indicadores ADD COLUMN responsable_nombre VARCHAR(300);');
      console.log('Columna responsable_nombre agregada');
    } else {
      console.log('La columna ya existe');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

migrate();
