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

// ─── Seguridad y parseo ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
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

async function iniciar() {
  try {
    await sequelize.authenticate();
    console.log('Conexión a PostgreSQL establecida');

    await sequelize.sync({ alter: true });
    console.log('Modelos sincronizados con la base de datos');

    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
      console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('Error al iniciar el servidor:', err.message);
    process.exit(1);
  }
}

iniciar();
