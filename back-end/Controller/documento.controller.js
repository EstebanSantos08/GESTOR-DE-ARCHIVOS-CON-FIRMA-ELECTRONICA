'use strict';

const multer = require('multer');
const { pipeline } = require('stream');
const { sequelize, Documento, Usuario, Rol, Facultad, Subcriterio, Actividad, FlujoFirma, PasoFirma } = require('../Model');
const firmaService = require('../Services/firma.service');
const workflowService = require('../Services/workflow.service');
const {
  subirArchivoR2,
  obtenerBufferR2,
  obtenerStreamR2,
  eliminarArchivoR2,
  eliminarPorPrefijoR2,
  ArchivoNoEncontradoError,
} = require('../Services/r2.service');
const { generarClave, sanitizarNombre } = require('../Utils/r2Keys');

// ─── Configuración Multer en Memoria ──────────────────────────────────────
const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_MB || '20', 10);

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype !== 'application/pdf') {
    const error = new Error('Solo se permiten archivos PDF');
    error.status = 415;
    return cb(error, false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
});

// ─── Controladores ─────────────────────────────────────────────────────────

/**
 * Sube un documento PDF original a Cloudflare R2 directamente en un Subcriterio
 * y prepara los sellos visuales para todos los firmantes programados.
 */
async function subirDocumento(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Archivo PDF requerido' });
  }

  // Validar número mágico %PDF-
  if (!req.file.buffer || req.file.buffer.subarray(0, 5).toString('utf-8') !== '%PDF-') {
    return res.status(415).json({ error: 'El archivo subido no es un PDF válido (cabecera %PDF- no encontrada)' });
  }

  let claveOriginal = null;
  let clavePreparado = null;

  try {
    const bufferOriginal = req.file.buffer;
    const hashOriginal = firmaService.calcularHash(bufferOriginal);

    // 1. Subir PDF original a Cloudflare R2
    claveOriginal = generarClave('originales', req.file.originalname);
    await subirArchivoR2(claveOriginal, bufferOriginal, 'application/pdf');

    const subcriterioId = req.body.subcriterio_id || req.body.actividad_id || null;

    // 2. Crear registro inicial en PostgreSQL vinculado a subcriterio_id
    const documento = await Documento.create({
      nombre_original: req.file.originalname,
      ruta_archivo: claveOriginal,
      ruta_archivo_original: claveOriginal,
      estado: 'PENDIENTE',
      subido_por_id: req.usuario.id,
      facultad_id: req.body.facultad_id || null,
      subcriterio_id: subcriterioId,
      actividad_id: req.body.actividad_id || null,
      hash_sha256: hashOriginal,
    });

    // 3. Asignar el firmante inicial según la parametrización del workflow
    await workflowService.asignarFirmanteInicial(documento);

    // 4. Preparar el documento (estampar sellos visuales QR de los firmantes programados)
    try {
      const firmantesProgramados = await workflowService.obtenerFirmantesProgramados(documento);
      const pdfPreparado = await firmaService.prepararDocumento(
        bufferOriginal,
        firmantesProgramados,
        documento.creado_en || new Date()
      );

      clavePreparado = generarClave('preparados', req.file.originalname);
      await subirArchivoR2(clavePreparado, pdfPreparado, 'application/pdf');

      const hashPreparado = firmaService.calcularHash(pdfPreparado);
      await documento.update({
        ruta_archivo: clavePreparado,
        hash_sha256: hashPreparado,
      });
    } catch (prepErr) {
      console.warn('[Workflow] No se pudo pre-estampar sellos en la subida, se mantiene original:', prepErr.message);
    }

    res.status(201).json(await documento.reload());
  } catch (err) {
    // Compensación: eliminar objetos huérfanos de R2 si falló el guardado en base de datos
    if (claveOriginal) await eliminarArchivoR2(claveOriginal);
    if (clavePreparado) await eliminarArchivoR2(clavePreparado);

    res.status(500).json({ error: err.message });
  }
}

/**
 * Lista los documentos accesibles para el usuario actual según sus roles y subcriterio.
 */
async function listarDocumentos(req, res) {
  try {
    const where = {};
    const usuarioRoles = req.usuario.roles || [req.usuario.rol].filter(Boolean);
    const esAdmin = usuarioRoles.includes('ADMINISTRADOR');

    if (req.query.subcriterio_id) {
      where.subcriterio_id = parseInt(req.query.subcriterio_id, 10);

      if (!esAdmin) {
        const { Op } = require('sequelize');
        where[Op.or] = [
          { subido_por_id: req.usuario.id },
          { firmante_actual_id: req.usuario.id },
        ];
      }
    } else if (req.query.actividad_id) {
      where.actividad_id = parseInt(req.query.actividad_id, 10);

      if (!esAdmin) {
        const { Op } = require('sequelize');
        where[Op.or] = [
          { subido_por_id: req.usuario.id },
          { firmante_actual_id: req.usuario.id },
        ];
      }
    } else if (esAdmin) {
      // Admin ve todos sin restricción
    } else {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { subido_por_id: req.usuario.id },
        { firmante_actual_id: req.usuario.id },
      ];
    }

    if (req.query.estado) where.estado = req.query.estado;

    const includeModels = [
      { model: Usuario, as: 'subidoPor', attributes: ['id', 'nombre', 'email'] },
      { model: Usuario, as: 'firmanteActual', attributes: ['id', 'nombre'] },
      { model: Facultad, as: 'facultad', attributes: ['id', 'nombre'] },
      { model: Actividad, as: 'actividad', attributes: ['id', 'nombre'] },
      {
        model: FlujoFirma,
        as: 'flujoFirma',
        include: [{ model: PasoFirma, as: 'pasos', include: [{ model: Rol, as: 'rolRequerido' }] }],
      },
    ];

    if (Subcriterio) {
      includeModels.push({ model: Subcriterio, as: 'subcriterio', attributes: ['id', 'numero', 'nombre'] });
    }

    const documentos = await Documento.findAll({
      where,
      include: includeModels,
      order: [['creado_en', 'DESC']],
    });

    documentos.forEach((d) => {
      if (d.flujoFirma && d.flujoFirma.pasos) {
        d.flujoFirma.pasos.sort((a, b) => a.orden - b.orden);
      }
    });

    res.json(documentos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * Obtiene los detalles de un documento específico por ID.
 */
async function obtenerDocumento(req, res) {
  try {
    const includeModels = [
      { model: Usuario, as: 'subidoPor', attributes: ['id', 'nombre', 'email'] },
      { model: Usuario, as: 'firmanteActual', include: [{ model: Rol, as: 'roles' }] },
      { model: Facultad, as: 'facultad' },
      { model: Actividad, as: 'actividad' },
      {
        model: FlujoFirma,
        as: 'flujoFirma',
        include: [{ model: PasoFirma, as: 'pasos', include: [{ model: Rol, as: 'rolRequerido' }] }],
      },
    ];

    if (Subcriterio) {
      includeModels.push({ model: Subcriterio, as: 'subcriterio' });
    }

    const documento = await Documento.findByPk(req.params.id, {
      include: includeModels,
    });

    if (!documento) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    if (documento.flujoFirma && documento.flujoFirma.pasos) {
      documento.flujoFirma.pasos.sort((a, b) => a.orden - b.orden);
    }

    res.json(documento);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * Ejecuta la firma digital PAdES-BES sobre el documento actual en R2 con transacción
 * y bloqueo de fila para evitar firmas concurrentes sobre la misma versión.
 */
async function firmarDocumento(req, res) {
  let certBuffer = null;
  let claveFirmada = null;

  const t = await sequelize.transaction();

  try {
    const documento = await Documento.findByPk(req.params.id, {
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!documento) {
      await t.rollback();
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    if (!documento.ruta_archivo || !documento.ruta_archivo.startsWith('documentos/')) {
      await t.rollback();
      return res.status(410).json({
        error: 'El archivo de este documento se encuentra en una ruta local heredada no disponible en el almacenamiento en la nube R2. Debe ser subido nuevamente.',
      });
    }

    const usuarioFirmante = await Usuario.findByPk(req.usuario.id, {
      include: [{ model: Rol, as: 'roles' }],
      transaction: t,
    });

    let pdfBuffer = await obtenerBufferR2(documento.ruta_archivo);

    if (documento.ruta_archivo.startsWith('documentos/originales/')) {
      const firmantesProgramados = await workflowService.obtenerFirmantesProgramados(documento);
      pdfBuffer = await firmaService.prepararDocumento(pdfBuffer, firmantesProgramados, documento.creado_en);

      const clavePrep = generarClave('preparados', documento.nombre_original);
      await subirArchivoR2(clavePrep, pdfBuffer, 'application/pdf');
      await documento.update({
        ruta_archivo: clavePrep,
        hash_sha256: firmaService.calcularHash(pdfBuffer),
      }, { transaction: t });
    }

    let certPassword;

    if (req.body.certBase64 && req.body.certPassword) {
      certBuffer = Buffer.from(req.body.certBase64, 'base64');
      certPassword = req.body.certPassword;
    } else {
      const certInstBase64 = process.env.CERT_INSTITUCIONAL_P12_BASE64;
      const certInstPassword = process.env.CERT_INSTITUCIONAL_PASSWORD;

      if (!certInstBase64 || !certInstPassword) {
        await t.rollback();
        return res.status(400).json({
          error: 'No se encontró un certificado para firmar. Carga tu certificado .p12 personal o configura el certificado institucional.',
        });
      }

      certBuffer = Buffer.from(certInstBase64, 'base64');
      certPassword = certInstPassword;
    }

    const JERARQUIA_ROLES_FIRMA = {
      DOCENTE: 1,
      RESPONSABLE_AREA: 2,
      RESP_AREA: 2,
      DIRECTOR_CARRERA: 3,
      SUBDECANO: 4,
      DECANO: 5,
      RECTOR: 6,
      ADMINISTRADOR: 7,
    };
    const rolesOrdenados = [...(usuarioFirmante.roles || [])].sort((a, b) => {
      const nivelA = JERARQUIA_ROLES_FIRMA[(a.nombre || '').toUpperCase()] ?? a.nivel ?? 0;
      const nivelB = JERARQUIA_ROLES_FIRMA[(b.nombre || '').toUpperCase()] ?? b.nivel ?? 0;
      return nivelB - nivelA;
    });
    const nombreRolFirmante = rolesOrdenados[0]?.nombre || 'Usuario';

    const resultado = await firmaService.firmarDocumento({
      pdfBuffer,
      certBuffer,
      passwordCert: certPassword,
      firmante: { nombre: usuarioFirmante.nombre, rol: nombreRolFirmante },
    });

    claveFirmada = generarClave('firmados', documento.nombre_original);
    await subirArchivoR2(claveFirmada, resultado.pdfFirmado, 'application/pdf');

    const rutaAnterior = documento.ruta_archivo;
    const rutaOriginal = documento.ruta_archivo_original || rutaAnterior;

    await documento.update({
      ruta_archivo: claveFirmada,
      ruta_archivo_original: rutaOriginal,
      hash_sha256: resultado.hashSha256,
    }, { transaction: t });

    const documentoActualizado = await workflowService.procesarFirma(
      documento.id,
      req.usuario,
      req.body.observaciones || null,
      { transaction: t }
    );

    await t.commit();

    res.json({
      mensaje: 'Documento firmado correctamente',
      documento: documentoActualizado,
    });
  } catch (err) {
    try {
      await t.rollback();
    } catch {
      // rollback ya ejecutado o no aplicable
    }

    if (claveFirmada) {
      await eliminarArchivoR2(claveFirmada);
    }

    const statusCode = err.name === 'CertificadoInvalidoError' ? 400 : 500;
    res.status(statusCode).json({ error: err.message });
  } finally {
    if (certBuffer && Buffer.isBuffer(certBuffer)) {
      certBuffer.fill(0);
    }
  }
}

/**
 * Rechaza un documento dentro del workflow.
 */
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

/**
 * Descarga o visualiza inline un documento desde Cloudflare R2 vía stream seguro.
 */
async function descargarDocumento(req, res) {
  try {
    const documento = await Documento.findByPk(req.params.id);
    if (!documento) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    if (!documento.ruta_archivo || !documento.ruta_archivo.startsWith('documentos/')) {
      return res.status(410).json({
        error: 'El archivo de este documento se encuentra en una ruta local heredada no disponible en el almacenamiento en la nube R2.',
      });
    }

    const { stream, contentLength, contentType } = await obtenerStreamR2(documento.ruta_archivo);

    const nombreAscii = sanitizarNombre(documento.nombre_original);
    const nombreUtf8 = encodeURIComponent(documento.nombre_original);

    res.setHeader('Content-Type', contentType || 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${nombreAscii}"; filename*=UTF-8''${nombreUtf8}`
    );
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    pipeline(stream, res, (err) => {
      if (err && !res.headersSent) {
        console.error('[Descarga] Error al transmitir stream de R2:', err);
        res.status(500).json({ error: 'Error al transmitir el documento' });
      }
    });
  } catch (err) {
    if (err instanceof ArchivoNoEncontradoError) {
      return res.status(404).json({ error: 'Archivo no encontrado en el almacenamiento en la nube R2' });
    }
    res.status(500).json({ error: err.message });
  }
}

/**
 * Elimina un documento de PostgreSQL y sus versiones asociadas en Cloudflare R2.
 */
async function eliminarDocumento(req, res) {
  try {
    const documento = await Documento.findByPk(req.params.id);
    if (!documento) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    const usuarioRoles = req.usuario.roles || [req.usuario.rol].filter(Boolean);
    const esAdmin = usuarioRoles.includes('ADMINISTRADOR');
    const esPropietario = documento.subido_por_id === req.usuario.id;
    const estadoPermitido = ['PENDIENTE', 'RECHAZADO'].includes(documento.estado);

    if (!esAdmin && !(esPropietario && estadoPermitido)) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este documento' });
    }

    if (documento.ruta_archivo && documento.ruta_archivo.startsWith('documentos/')) {
      await eliminarArchivoR2(documento.ruta_archivo);
    }

    if (
      documento.ruta_archivo_original &&
      documento.ruta_archivo_original.startsWith('documentos/') &&
      documento.ruta_archivo_original !== documento.ruta_archivo
    ) {
      await eliminarArchivoR2(documento.ruta_archivo_original);
    }

    await documento.destroy();
    res.json({ mensaje: 'Documento eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * Retorna las métricas cuantitativas para el Dashboard.
 */
async function resumenDocumentos(req, res) {
  try {
    const where = {};
    const usuarioRoles = req.usuario.roles || [req.usuario.rol].filter(Boolean);

    if (usuarioRoles.includes('DOCENTE') || usuarioRoles.includes('RESPONSABLE_AREA')) {
      where.subido_por_id = req.usuario.id;
    }

    const todos = await Documento.findAll({ where, attributes: ['estado'] });

    res.json({
      total: todos.length,
      pendientesFirma: todos.filter((d) => [
        'PENDIENTE', 'EN_REVISION', 'FIRMADO_DIRECTOR', 'FIRMADO_SUBDECANO', 'FIRMADO_DECANO',
      ].includes(d.estado)).length,
      firmados: todos.filter((d) => d.estado === 'COMPLETADO').length,
      rechazados: todos.filter((d) => d.estado === 'RECHAZADO').length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * Purga completa de todos los documentos en BD y todos los objetos bajo 'documentos/' en R2.
 */
async function purgarTodosDocumentos(req, res) {
  try {
    const usuarioRoles = req.usuario.roles || [req.usuario.rol].filter(Boolean);
    const esAdmin = usuarioRoles.includes('ADMINISTRADOR');

    if (!esAdmin) {
      return res.status(403).json({ error: 'No autorizado. Solo ADMINISTRADOR puede purgar documentos.' });
    }

    console.log('[R2] Purgando todos los objetos con prefijo documentos/...');
    const eliminadosR2 = await eliminarPorPrefijoR2('documentos/');
    console.log(`[R2] ${eliminadosR2} objetos eliminados de Cloudflare R2.`);

    try {
      await Documento.destroy({ where: {}, truncate: true, cascade: true });
    } catch {
      await Documento.destroy({ where: {}, cascade: true });
    }

    res.json({
      mensaje: 'Todos los documentos y archivos de R2 han sido purgados exitosamente',
      archivosR2Eliminados: eliminadosR2,
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
  purgarTodosDocumentos,
  resumenDocumentos,
};
