const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { validationResult } = require('express-validator');
const { Documento, Usuario, Rol, Facultad, Actividad, FlujoFirma, PasoFirma } = require('../Model');
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
    const usuarioRoles = req.usuario.roles || [req.usuario.rol].filter(Boolean);
    const esAdmin = usuarioRoles.includes('ADMINISTRADOR');

    if (req.query.actividad_id) {
      // Filtrar por actividad — solo documentos de esa actividad
      where.actividad_id = parseInt(req.query.actividad_id);

      // Si no es admin, además filtrar por visibilidad:
      // - documentos que subió el usuario, O
      // - documentos donde es el firmante actual, O
      // - documentos donde ya participó (firmó en algún paso anterior)
      if (!esAdmin) {
        const { Op } = require('sequelize');
        where[Op.or] = [
          { subido_por_id: req.usuario.id },
          { firmante_actual_id: req.usuario.id },
        ];
      }
    } else if (esAdmin) {
      // ADMINISTRADOR ve todos los documentos sin filtro
      // (solo si pide ?todos=true explícitamente)
      if (!req.query.todos) {
        // Sin todos=true, admin también ve solo los relevantes para él
        // pero puede ver todos con ?todos=true
      }
    } else {
      // Usuarios normales: solo ven documentos que subieron O donde son firmante actual
      const { Op } = require('sequelize');
      where[Op.or] = [
        { subido_por_id: req.usuario.id },
        { firmante_actual_id: req.usuario.id },
      ];
    }

    if (req.query.estado) where.estado = req.query.estado;

    const documentos = await Documento.findAll({
      where,
      include: [
        { model: Usuario, as: 'subidoPor', attributes: ['id', 'nombre', 'email'] },
        { model: Usuario, as: 'firmanteActual', attributes: ['id', 'nombre'] },
        { model: Facultad, as: 'facultad', attributes: ['id', 'nombre'] },
        { model: Actividad, as: 'actividad', attributes: ['id', 'nombre'] },
        { 
          model: FlujoFirma, as: 'flujoFirma', 
          include: [{ model: PasoFirma, as: 'pasos', include: [{ model: Rol, as: 'rolRequerido' }] }] 
        },
      ],
      order: [['creado_en', 'DESC']],
    });

    // Ordenar los pasos del flujo si existe
    documentos.forEach(d => {
      if (d.flujoFirma && d.flujoFirma.pasos) {
        d.flujoFirma.pasos.sort((a, b) => a.orden - b.orden);
      }
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
        { model: Usuario, as: 'firmanteActual', include: [{ model: Rol, as: 'roles' }] },
        { model: Facultad, as: 'facultad' },
        { model: Actividad, as: 'actividad' },
        { 
          model: FlujoFirma, as: 'flujoFirma', 
          include: [{ model: PasoFirma, as: 'pasos', include: [{ model: Rol, as: 'rolRequerido' }] }] 
        },
      ],
    });

    if (documento && documento.flujoFirma && documento.flujoFirma.pasos) {
      documento.flujoFirma.pasos.sort((a, b) => a.orden - b.orden);
    }

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

    const usuarioFirmante = await Usuario.findByPk(req.usuario.id, {
      include: [{ model: Rol, as: 'roles' }],
    });

    // Determina el certificado: primero el enviado por el cliente, luego el del servidor
    let rutaCertTemporal = null;
    let certP12Path;
    let certPassword;

    if (req.body.certBase64 && req.body.certPassword) {
      // El firmante envió su propio certificado .p12 como base64
      const certBuffer = Buffer.from(req.body.certBase64, 'base64');
      rutaCertTemporal = path.join(UPLOADS_DIR, `cert_temp_${req.usuario.id}_${Date.now()}.p12`);
      fs.writeFileSync(rutaCertTemporal, certBuffer);
      certP12Path = rutaCertTemporal;
      certPassword = req.body.certPassword;
    } else {
      // Fallback al certificado institucional del servidor
      certP12Path = process.env.CERT_P12_PATH;
      certPassword = process.env.CERT_P12_PASSWORD;
      if (!certP12Path || !fs.existsSync(certP12Path)) {
        return res.status(400).json({ error: 'No se encontró un certificado para firmar. Carga tu certificado .p12 en Perfil antes de firmar.' });
      }
    }

    try {
      // Aplica firma criptográfica + sello visual
      const resultado = await firmaService.firmarDocumento({
        rutaPdf: documento.ruta_archivo,
        rutaCertP12: certP12Path,
        passwordCert: certPassword,
        firmante: { nombre: usuarioFirmante.nombre, rol: (usuarioFirmante.roles && usuarioFirmante.roles[0]?.nombre) || 'Usuario' },
      });

      // Guarda el PDF firmado con nuevo nombre
      const rutaFirmada = documento.ruta_archivo.replace(/\.pdf$/i, '') + `_firmado_${Date.now()}.pdf`;
      fs.writeFileSync(rutaFirmada, resultado.pdfFirmado);

      // Actualiza la ruta en BD y avanza el estado en el workflow
      await documento.update({ ruta_archivo: rutaFirmada, hash_sha256: resultado.hashSha256 });
      const documentoActualizado = await workflowService.procesarFirma(
        documento.id,
        req.usuario,
        req.body.observaciones || null
      );

      res.json({ mensaje: 'Documento firmado correctamente', documento: documentoActualizado });
    } finally {
      // Elimina el certificado temporal si se usó uno del cliente
      if (rutaCertTemporal && fs.existsSync(rutaCertTemporal)) {
        fs.unlinkSync(rutaCertTemporal);
      }
    }
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

async function eliminarDocumento(req, res) {
  try {
    const documento = await Documento.findByPk(req.params.id);
    if (!documento) return res.status(404).json({ error: 'Documento no encontrado' });

    // Lógica de eliminación por roles:
    // ADMINISTRADOR puede eliminar cualquier documento
    // El propietario puede eliminar solo si está en PENDIENTE o RECHAZADO
    const esAdmin = req.usuario.roles && req.usuario.roles.includes('ADMINISTRADOR');
    const esPropietario = documento.subido_por_id === req.usuario.id;
    const estadoPermitido = ['PENDIENTE', 'RECHAZADO'].includes(documento.estado);

    if (!esAdmin && !(esPropietario && estadoPermitido)) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este documento' });
    }

    // Elimina el archivo físico del disco
    if (fs.existsSync(documento.ruta_archivo)) {
      fs.unlinkSync(documento.ruta_archivo);
    }

    await documento.destroy();
    res.json({ mensaje: 'Documento eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function resumenDocumentos(req, res) {
  try {
    const { Op } = require('sequelize');
    const where = {};

    // DOCENTE y RESPONSABLE_AREA solo ven sus propios documentos
    if (req.usuario.roles && (req.usuario.roles.includes('DOCENTE') || req.usuario.roles.includes('RESPONSABLE_AREA'))) {
      where.subido_por_id = req.usuario.id;
    }
    // DIRECTOR_CARRERA, SUBDECANO, DECANO, RECTOR y ADMINISTRADOR ven todos

    const todos = await Documento.findAll({ where, attributes: ['estado'] });

    res.json({
      total: todos.length,
      pendientesFirma: todos.filter(d => [
        'PENDIENTE', 'EN_REVISION', 'FIRMADO_DIRECTOR', 'FIRMADO_SUBDECANO', 'FIRMADO_DECANO',
      ].includes(d.estado)).length,
      firmados: todos.filter(d => d.estado === 'COMPLETADO').length,
      rechazados: todos.filter(d => d.estado === 'RECHAZADO').length,
    });
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
  eliminarDocumento,
  resumenDocumentos,
};
