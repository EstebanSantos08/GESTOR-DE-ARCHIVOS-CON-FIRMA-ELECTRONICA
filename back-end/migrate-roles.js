/**
 * Migración: Agregar nuevos valores al ENUM de roles en PostgreSQL.
 * PostgreSQL no permite modificar ENUMs fácilmente con Sequelize sync({ alter }),
 * así que agregamos los valores manualmente antes de sincronizar.
 *
 * Ejecutar: node migrate-roles.js
 */
require('dotenv').config();
const { sequelize } = require('./Model');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Conectado a PostgreSQL\n');

    // Verificar valores actuales del ENUM
    const [enumValues] = await sequelize.query(`
      SELECT e.enumlabel 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE t.typname = 'enum_roles_nombre'
      ORDER BY e.enumsortorder;
    `);
    
    const existentes = enumValues.map(v => v.enumlabel);
    console.log('Valores ENUM actuales:', existentes);

    // Nuevos valores a agregar
    const nuevos = [
      'RESPONSABLE_AREA',
      'DIRECTOR_CARRERA',
      'SUBDECANO',
      'ADMINISTRADOR',
    ];

    for (const valor of nuevos) {
      if (!existentes.includes(valor)) {
        await sequelize.query(`ALTER TYPE "enum_roles_nombre" ADD VALUE IF NOT EXISTS '${valor}';`);
        console.log(`  ✅ Agregado: ${valor}`);
      } else {
        console.log(`  ⏭️  Ya existe: ${valor}`);
      }
    }

    // Actualizar niveles de roles existentes (DOCENTE 1→2, DECANO 2→5, RECTOR 3→6)
    console.log('\nActualizando niveles de roles existentes...');
    
    await sequelize.query(`UPDATE roles SET nivel = 2 WHERE nombre = 'DOCENTE' AND nivel != 2;`);
    await sequelize.query(`UPDATE roles SET nivel = 5 WHERE nombre = 'DECANO' AND nivel != 5;`);
    await sequelize.query(`UPDATE roles SET nivel = 6 WHERE nombre = 'RECTOR' AND nivel != 6;`);
    
    console.log('  ✅ DOCENTE → nivel 2');
    console.log('  ✅ DECANO → nivel 5');
    console.log('  ✅ RECTOR → nivel 6');

    console.log('\nMigración de ENUM completada exitosamente.');
    console.log('Ahora puedes ejecutar: npm run dev (el servidor sincronizará las tablas)');
    console.log('Luego ejecuta: node seed.js (para crear los nuevos roles y usuarios)');
    
    process.exit(0);
  } catch (err) {
    console.error('Error en migración:', err.message);
    console.error(err);
    process.exit(1);
  }
}

migrate();
