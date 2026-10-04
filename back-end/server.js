require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { sequelize } = require('./Model');

const authRoutes = require('./Routes/auth.routes');
const parametrizacionRoutes = require('./Routes/parametrizacion.routes');
const documentoRoutes = require('./Routes/documento.routes');
const flujosRoutes = require('./Routes/flujos.routes');

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────
// En producción se permite FRONTEND_URL, subdominios *.pages.dev (Cloudflare) y localhost.
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(u => u.trim())
  : [];

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir peticiones sin origen (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);

    // En desarrollo permitir cualquier origen
    if (process.env.NODE_ENV !== 'production') return callback(null, true);

    // En producción permitir orígenes explícitos, Cloudflare Pages (*.pages.dev) o localhost
    const isExplicit = allowedOrigins.includes(origin);
    const isCloudflarePages = /^https:\/\/[a-zA-Z0-9-]+\.pages\.dev$/.test(origin);
    const isLocal = /^http:\/\/localhost(:\d+)?$/.test(origin);

    if (isExplicit || isCloudflarePages || isLocal || allowedOrigins.length === 0) {
      return callback(null, true);
    }
    return callback(new Error(`Bloqueado por política CORS: ${origin}`));
  },
  credentials: true,
};

// ─── Seguridad y parseo ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Rutas ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/parametrizacion', parametrizacionRoutes);
app.use('/api/documentos', documentoRoutes);
app.use('/api/flujos', flujosRoutes);

// ─── Health check ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ estado: 'OK', timestamp: new Date().toISOString() });
});

// ─── Manejo global de errores ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: `Error de archivo: ${err.message}` });
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ─── Inicio ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
// Render requiere escuchar en 0.0.0.0 (no solo en localhost)
const HOST = '0.0.0.0';

async function iniciar() {
  try {
    await sequelize.authenticate();
    console.log('Conexión a PostgreSQL establecida');

    // En producción se usa { alter: false } para no mutar el esquema automáticamente.
    // Usa migraciones explícitas para cambios de esquema en producción.
    const syncOptions = process.env.NODE_ENV === 'production'
      ? { alter: false }
      : { alter: true };

    await sequelize.sync(syncOptions);
    console.log('Modelos sincronizados con la base de datos');

    // Auto-seed si la base de datos está vacía (primer despliegue en producción)
    try {
      const { Rol } = require('./Model');
      const totalRoles = await Rol.count();
      if (totalRoles === 0) {
        console.log('🌱 Base de datos vacía detectada. Ejecutando seed inicial...');
        const { execSync } = require('child_process');
        execSync('node seed.js && node seed-criterios.js && node seed-carreras-demo.js', {
          cwd: __dirname,
          stdio: 'inherit'
        });
        console.log('✅ Seed inicial completado con éxito.');
      }
    } catch (seedErr) {
      console.warn('⚠️ Nota sobre seed inicial:', seedErr.message);
    }

    app.listen(PORT, HOST, () => {
      console.log(`Servidor corriendo en http://${HOST}:${PORT}`);
      console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('Error al iniciar el servidor:', err.message);
    process.exit(1);
  }
}

iniciar();

