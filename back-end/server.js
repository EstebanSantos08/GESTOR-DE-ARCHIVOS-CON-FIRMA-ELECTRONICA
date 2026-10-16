require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { sequelize } = require('./Model');
const r2Service = require('./Services/r2.service');

const authRoutes = require('./Routes/auth.routes');
const parametrizacionRoutes = require('./Routes/parametrizacion.routes');
const documentoRoutes = require('./Routes/documento.routes');
const flujosRoutes = require('./Routes/flujos.routes');

const app = express();

// ─── Validación estricta de Variables de Entorno al arrancar ──────────────
function validarVariablesEntorno() {
  const obligatorias = [
    'CLOUDFLARE_R2_ACCOUNT_ID',
    'CLOUDFLARE_R2_ACCESS_KEY_ID',
    'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
    'CLOUDFLARE_R2_BUCKET_NAME',
  ];

  const faltantes = obligatorias.filter((variable) => !process.env[variable]);

  if (faltantes.length > 0) {
    console.error('❌ ERROR FATAL: Faltan variables de entorno requeridas para Cloudflare R2:');
    faltantes.forEach((v) => console.error(`   - ${v}`));
    console.error('Verifique la configuración en el panel de Render o en su archivo .env local.');
    process.exit(1);
  }

  // Certificado institucional en memoria (Base64)
  if (!process.env.CERT_INSTITUCIONAL_P12_BASE64 || !process.env.CERT_INSTITUCIONAL_PASSWORD) {
    console.warn('⚠️ ADVERTENCIA: CERT_INSTITUCIONAL_P12_BASE64 o CERT_INSTITUCIONAL_PASSWORD no están configurados.');
    console.warn('   Los firmantes deberán proveer su propio certificado .p12 en cada firma.');
  } else {
    console.log('✓ Certificado institucional en memoria configurado correctamente.');
  }

  console.log(`✓ Configuración R2 validada: Bucket "${process.env.CLOUDFLARE_R2_BUCKET_NAME}"`);
}

validarVariablesEntorno();

// ─── CORS ─────────────────────────────────────────────────────────────────
// En producción se permite FRONTEND_URL, subdominios *.pages.dev (Cloudflare) y localhost.
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((u) => u.trim())
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ─── Rutas ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/parametrizacion', parametrizacionRoutes);
app.use('/api/documentos', documentoRoutes);
app.use('/api/flujos', flujosRoutes);

// ─── Health check ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    estado: 'OK',
    almacenamiento: 'Cloudflare R2',
    bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    timestamp: new Date().toISOString(),
  });
});

// ─── Endpoint para ejecutar seeds bajo demanda ─────────────────────────────
app.all('/api/admin/seed', async (req, res) => {
  try {
    const { execSync } = require('child_process');
    console.log('🌱 Ejecutando seed solicitado...');
    const out1 = execSync('node seed.js', { cwd: __dirname }).toString();
    const out2 = execSync('node seed-criterios.js', { cwd: __dirname }).toString();
    const out3 = execSync('node seed-carreras-demo.js', { cwd: __dirname }).toString();
    res.json({
      estado: 'OK',
      mensaje: 'Base de datos poblada exitosamente con todos los seeds.',
      salida: [out1, out2, out3].join('\n---\n'),
    });
  } catch (err) {
    console.error('Error al ejecutar seeds:', err);
    res.status(500).json({ error: err.message, detalle: err.stdout?.toString() || err.stderr?.toString() });
  }
});

// ─── Manejo global de errores ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const maxMb = process.env.MAX_UPLOAD_MB || 20;
      return res.status(413).json({ error: `El archivo excede el tamaño máximo permitido (${maxMb} MB)` });
    }
    return res.status(400).json({ error: `Error de archivo: ${err.message}` });
  }

  if (err.status === 415 || err.message === 'Solo se permiten archivos PDF') {
    return res.status(415).json({ error: err.message });
  }

  console.error(err.stack || err.message);
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

// ─── Inicio ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
// Render requiere escuchar en 0.0.0.0 (no solo en localhost)
const HOST = '0.0.0.0';

async function iniciar() {
  try {
    // 1. Conexión a Base de Datos PostgreSQL
    await sequelize.authenticate();
    console.log('Conexión a PostgreSQL establecida');

    // Forzar actualización segura del esquema para incorporar nuevas columnas (como ruta_archivo_original)
    await sequelize.sync({ alter: true });
    console.log('Modelos sincronizados con la base de datos');

    // Auto-seed si la base de datos está vacía
    try {
      const { Rol, UsuarioRol } = require('./Model');
      const totalRoles = await Rol.count();
      const totalAsignaciones = await UsuarioRol.count();
      if (totalRoles === 0 || totalAsignaciones === 0) {
        console.log(`🌱 Asignaciones incompletas detectadas (roles: ${totalRoles}, asignaciones: ${totalAsignaciones}). Ejecutando seed...`);
        const { execSync } = require('child_process');
        execSync('node seed.js && node seed-criterios.js && node seed-carreras-demo.js', {
          cwd: __dirname,
          stdio: 'inherit',
        });
        console.log('✅ Seed completado con éxito.');
      }
    } catch (seedErr) {
      console.warn('⚠️ Nota sobre seed inicial:', seedErr.message);
    }

    // 2. Conexión y auto-creación del bucket en Cloudflare R2
    console.log('☁️ Verificando y asegurando bucket en Cloudflare R2...');
    try {
      const bucketVerificado = await r2Service.asegurarBucketExiste();
      console.log(`✅ Bucket "${bucketVerificado}" en Cloudflare R2 verificado y listo.`);
    } catch (r2Err) {
      console.error('❌ ERROR FATAL AL CONECTAR CON CLOUDFLARE R2:');
      console.error(`   ${r2Err.message}`);
      console.error('Verifique que el token tenga permiso Admin Read & Write y que las credenciales sean correctas.');
      process.exit(1); // Hace que Render falle el despliegue de inmediato
    }

    // 3. Escuchar peticiones solo después de confirmar R2 y BD
    app.listen(PORT, HOST, () => {
      console.log(`🚀 Servidor corriendo en http://${HOST}:${PORT}`);
      console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('Error al iniciar el servidor:', err.message);
    process.exit(1);
  }
}

iniciar();
