const { Sequelize } = require('sequelize');

// ─── Conexión a PostgreSQL ──────────────────────────────────────────────────
// Render inyecta una DATABASE_URL completa para su PostgreSQL gestionado.
// En desarrollo local se usan las variables DB_* individuales.
// El logging solo se habilita en desarrollo para no ensuciar la salida en producción.

let sequelize;

if (process.env.DATABASE_URL) {
  // ── Modo Render (producción) ───────────────────────────────────────────────
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Necesario para el SSL autofirmado de Render
      },
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });
} else {
  // ── Modo local (variables individuales) ───────────────────────────────────
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    }
  );
}

module.exports = sequelize;

