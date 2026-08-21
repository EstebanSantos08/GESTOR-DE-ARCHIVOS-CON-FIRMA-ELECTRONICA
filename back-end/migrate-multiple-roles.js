require('dotenv').config();
const { sequelize } = require('./Model');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Conectado a PostgreSQL');

    // Sincronizar solo la tabla intermedia para que exista
    await sequelize.models.UsuarioRol.sync();
    console.log('Tabla usuario_roles creada o ya existía');

    // Verificar si rol_id todavía existe en usuarios
    const [cols] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='usuarios' AND column_name='rol_id';
    `);

    if (cols.length > 0) {
      console.log('Migrando datos de rol_id a usuario_roles...');
      await sequelize.query(`
        INSERT INTO usuario_roles (usuario_id, rol_id)
        SELECT id, rol_id FROM usuarios
        WHERE rol_id IS NOT NULL
        ON CONFLICT DO NOTHING;
      `);
      console.log('Datos migrados exitosamente.');
    } else {
      console.log('La columna rol_id ya no existe en usuarios, asumiendo que ya se migró.');
    }

    console.log('Migración completada. Ahora puedes iniciar el servidor.');
    process.exit(0);
  } catch (error) {
    console.error('Error durante la migración:', error);
    process.exit(1);
  }
}

migrate();
