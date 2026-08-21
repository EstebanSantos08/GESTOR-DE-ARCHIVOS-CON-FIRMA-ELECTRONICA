require('dotenv').config();
const { sequelize } = require('./Model');

async function migrateSession3() {
  try {
    console.log('Iniciando migración Sesión 3: Tabla actividades_usuarios...');
    // Sync the database with alter: true to create the missing junction table
    await sequelize.sync({ alter: true });
    console.log('Migración completada con éxito.');
    process.exit(0);
  } catch (err) {
    console.error('Error durante la migración:', err);
    process.exit(1);
  }
}

migrateSession3();
