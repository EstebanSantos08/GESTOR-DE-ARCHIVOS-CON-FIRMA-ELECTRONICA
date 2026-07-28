/**
 * Migración: Adaptar tablas existentes a la nueva jerarquía.
 * - Limpiar periodos/criterios/actividades antiguos
 * - Adaptar columnas de periodos (facultad_id → carrera_id)
 * - Adaptar columnas de actividades (criterio_id → indicador_id)
 *
 * Ejecutar: node migrate-session2.js
 */
require('dotenv').config();
const { sequelize } = require('./Model');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Conectado a PostgreSQL\n');

    // 1. Limpiar datos antiguos de la jerarquía
    console.log('Limpiando datos antiguos...');
    await sequelize.query('DELETE FROM documentos WHERE actividad_id IS NOT NULL');
    console.log('  ✅ Documentos vinculados limpiados');
    await sequelize.query('DELETE FROM actividades');
    console.log('  ✅ Actividades limpiadas');
    await sequelize.query('DELETE FROM criterios');
    console.log('  ✅ Criterios limpiados');
    await sequelize.query('DELETE FROM periodos');
    console.log('  ✅ Periodos limpiados');

    // 2. Migrar tabla periodos: facultad_id → carrera_id
    console.log('\nMigrando tabla periodos...');
    
    // Verificar si ya tiene carrera_id
    const [colsP] = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'periodos' AND column_name = 'carrera_id'"
    );
    if (colsP.length === 0) {
      await sequelize.query('ALTER TABLE periodos ADD COLUMN carrera_id INTEGER');
      console.log('  ✅ Columna carrera_id agregada');
    } else {
      console.log('  ⏭️  carrera_id ya existe');
    }
    
    // Eliminar facultad_id si existe
    const [colsFP] = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'periodos' AND column_name = 'facultad_id'"
    );
    if (colsFP.length > 0) {
      // Primero eliminar la FK constraint si existe
      const [fks] = await sequelize.query(
        "SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'periodos' AND constraint_type = 'FOREIGN KEY'"
      );
      for (const fk of fks) {
        if (fk.constraint_name.includes('facultad')) {
          await sequelize.query(`ALTER TABLE periodos DROP CONSTRAINT "${fk.constraint_name}"`);
          console.log(`  ✅ FK ${fk.constraint_name} eliminada`);
        }
      }
      await sequelize.query('ALTER TABLE periodos DROP COLUMN facultad_id');
      console.log('  ✅ Columna facultad_id eliminada');
    }

    // 3. Migrar tabla actividades: criterio_id → indicador_id
    console.log('\nMigrando tabla actividades...');
    
    const [colsA] = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'actividades' AND column_name = 'indicador_id'"
    );
    if (colsA.length === 0) {
      await sequelize.query('ALTER TABLE actividades ADD COLUMN indicador_id INTEGER');
      console.log('  ✅ Columna indicador_id agregada');
    } else {
      console.log('  ⏭️  indicador_id ya existe');
    }
    
    const [colsCA] = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'actividades' AND column_name = 'criterio_id'"
    );
    if (colsCA.length > 0) {
      const [fks2] = await sequelize.query(
        "SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'actividades' AND constraint_type = 'FOREIGN KEY'"
      );
      for (const fk of fks2) {
        if (fk.constraint_name.includes('criterio')) {
          await sequelize.query(`ALTER TABLE actividades DROP CONSTRAINT "${fk.constraint_name}"`);
          console.log(`  ✅ FK ${fk.constraint_name} eliminada`);
        }
      }
      await sequelize.query('ALTER TABLE actividades DROP COLUMN criterio_id');
      console.log('  ✅ Columna criterio_id eliminada');
    }

    console.log('\n══════════════════════════════════════════');
    console.log('Migración Sesión 2 completada.');
    console.log('Ahora reinicia el backend (npm run dev) y luego ejecuta: node seed.js');
    console.log('══════════════════════════════════════════');
    
    process.exit(0);
  } catch (err) {
    console.error('Error en migración:', err.message);
    console.error(err);
    process.exit(1);
  }
}

migrate();
