const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { validationResult } = require('express-validator');
const { Documento, Usuario, Rol, Facultad, Actividad } = require('../Model');
const firmaService = require('../Services/firma.service');
const workflowService = require('../Services/workflow.service');

// ─── Configuración Multer ──────────────────────────────────────────────────
const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads';

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const nombreSeguro = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${timestamp}_${nombreSeguro}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype !== 'application/pdf') {
    return cb(new Error('Solo se permiten archivos PDF'), false);
  }
  cb(null, true);
};

const MAX_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '10');

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
});

// ─── Controladores ─────────────────────────────────────────────────────────
async function subirDocumento(req, res) {
  if (!req.file) return res.status(400).json({ error: 'Archivo PDF requerido' });

  try {
    const hashSha256 = firmaService.calcularHash(fs.readFileSync(req.file.path));

    const documento = await Documento.create({
      nombre_original: req.file.originalname,
      ruta_archivo: req.file.path,
      estado: 'PENDIENTE',
      subido_por_id: req.usuario.id,
      facultad_id: req.body.facultad_id || null,
      actividad_id: req.body.actividad_id || null,
      hash_sha256: hashSha256,
    });

    // Asigna automáticamente al Decano como primer firmante
    await workflowService.asignarFirmanteInicial(documento);

    res.status(201).json(await documento.reload());
  } catch (err) {
    // Elimina el archivo subido si falla la creación en BD
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
}

async function listarDocumentos(req, res) {
  try {
    const where = {};

    if (req.query.actividad_id) {
      // Con actividad_id: todos los roles ven todos los docs de esa actividad
      where.actividad_id = parseInt(req.query.actividad_id);
    } else if (req.usuario.rol === 'DOCENTE') {
      where.subido_por_id = req.usuario.id;
    } else {
      where.firmante_actual_id = req.usuario.id;
    }

    if (req.query.estado) where.estado = req.query.estado;

    const documentos = await Documento.findAll({
      where,
      include: [
        { model: Usuario, as: 'subidoPor', attributes: ['id', 'nombre', 'email'] },
        { model: Usuario, as: 'firmanteActual', attributes: ['id', 'nombre'] },
        { model: Facultad, as: 'facultad', attributes: ['id', 'nombre'] },
        { model: Actividad, as: 'actividad', attributes: ['id', 'nombre'] },
      ],
      order: [['creado_en', 'DESC']],
    });

    res.json(documentos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function obtenerDocumento(req, res) {
  try {
    const documento = await Documento.findByPk(req.params.id, {
      include: [
        { model: Usuario, as: 'subidoPor', attributes: ['id', 'nombre', 'email'] },
        { model: Usuario, as: 'firmanteActual', include: [{ model: Rol, as: 'rol' }] },
        { model: Facultad, as: 'facultad' },
        { model: Actividad, as: 'actividad' },
      ],
    });

    if (!documento) return res.status(404).json({ error: 'Documento no encontrado' });
    res.json(documento);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function firmarDocumento(req, res) {
  try {
    const documento = await Documento.findByPk(req.params.id);
    if (!documento) return res.status(404).json({ error: 'Documento no encontrado' });

    const CERT_PATH = process.env.CERT_P12_PATH;
    const CERT_PASS = process.env.CERT_P12_PASSWORD;

    if (!fs.existsSync(CERT_PATH)) {
      return res.status(500).json({ error: 'Certificado institucional no configurado' });
    }

    const usuarioFirmante = await Usuario.findByPk(req.usuario.id, {
      include: [{ model: Rol, as: 'rol' }],
    });

    // Aplica firma criptográfica + sello visual
    const resultado = await firmaService.firmarDocumento({
      rutaPdf: documento.ruta_archivo,
      rutaCertP12: CERT_PATH,
      passwordCert: CERT_PASS,
      firmante: { nombre: usuarioFirmante.nombre, rol: usuarioFirmante.rol.nombre },
    });

    // Sobrescribe el PDF con la versión firmada
    const rutaFirmada = documento.ruta_archivo.replace('.pdf', `_firmado_${Date.now()}.pdf`);
    fs.writeFileSync(rutaFirmada, resultado.pdfFirmado);

    // Actualiza la ruta en BD y avanza el estado en el workflow
    await documento.update({ ruta_archivo: rutaFirmada, hash_sha256: resultado.hashSha256 });
    const documentoActualizado = await workflowService.procesarFirma(
      documento.id,
      req.usuario,
      req.body.observaciones || null
    );

    res.json({ mensaje: 'Documento firmado correctamente', documento: documentoActualizado });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function rechazarDocumento(req, res) {
  try {
    const { motivo } = req.body;
    if (!motivo) return res.status(400).json({ error: 'El motivo de rechazo es obligatorio' });

    const documento = await workflowService.rechazar(req.params.id, req.usuario, motivo);
    res.json({ mensaje: 'Documento rechazado', documento });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function descargarDocumento(req, res) {
  try {
    const documento = await Documento.findByPk(req.params.id);
    if (!documento) return res.status(404).json({ error: 'Documento no encontrado' });

    if (!fs.existsSync(documento.ruta_archivo)) {
      return res.status(404).json({ error: 'Archivo no encontrado en el servidor' });
    }

    res.download(documento.ruta_archivo, documento.nombre_original);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  upload,
  subirDocumento,
  listarDocumentos,
  obtenerDocumento,
  firmarDocumento,
  rechazarDocumento,
  descargarDocumento,
};
