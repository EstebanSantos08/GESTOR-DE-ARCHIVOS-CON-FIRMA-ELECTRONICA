require('dotenv').config();
const { sequelize } = require('./Model');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Conectado\n');

    // Verificar ENUM actual de estados de documentos
    const [vals] = await sequelize.query(
      "SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname='enum_documentos_estado' ORDER BY e.enumsortorder"
    );
    console.log('ENUM actual:', vals.map(v => v.enumlabel));

    // Agregar nuevos valores
    const nuevos = ['FIRMADO_DIRECTOR', 'FIRMADO_SUBDECANO'];
    for (const v of nuevos) {
      if (!vals.find(x => x.enumlabel === v)) {
        await sequelize.query(`ALTER TYPE "enum_documentos_estado" ADD VALUE IF NOT EXISTS '${v}'`);
        console.log('  ✅ Agregado:', v);
      } else {
        console.log('  ⏭️  Ya existe:', v);
      }
    }

    console.log('\nMigración de estados completada.');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

migrate();
