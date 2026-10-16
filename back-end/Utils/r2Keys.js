'use strict';

const path = require('path');
const crypto = require('crypto');

const TIPOS_VALIDOS = ['originales', 'preparados', 'firmados'];

/**
 * Sanitiza el nombre de un archivo preservando la extensión .pdf:
 * - Reemplaza cualquier caracter no alfanumérico, punto, guion bajo o guion por '_'
 * - Expresión con guion al final: /[^a-zA-Z0-9._-]/g para evitar rangos no deseados.
 * - Limita la longitud a máximo 150 caracteres.
 *
 * @param {string} nombre
 * @returns {string} Nombre sanitizado con extensión .pdf
 */
function sanitizarNombre(nombre = '') {
  const nombreLimpio = String(nombre || '').trim();
  const tieneExtPdf = path.extname(nombreLimpio).toLowerCase() === '.pdf';
  const nombreSinExt = tieneExtPdf
    ? nombreLimpio.slice(0, -4)
    : nombreLimpio;

  const baseSanitizada = nombreSinExt.replace(/[^a-zA-Z0-9._-]/g, '_');
  const baseTruncada = (baseSanitizada || 'documento').slice(0, 146);

  return `${baseTruncada}.pdf`;
}

/**
 * Genera una clave estructurada para Cloudflare R2 con UUID para evitar colisiones:
 * formato: documentos/${tipo}/${uuid}_${nombreSanitizado}
 *
 * @param {'originales' | 'preparados' | 'firmados'} tipo
 * @param {string} nombreOriginal
 * @returns {string} Clave completa para R2
 */
function generarClave(tipo, nombreOriginal) {
  if (!TIPOS_VALIDOS.includes(tipo)) {
    throw new Error(`Tipo de clave inválido: "${tipo}". Debe ser uno de: ${TIPOS_VALIDOS.join(', ')}`);
  }

  const uuid = crypto.randomUUID();
  const nombreSanitizado = sanitizarNombre(nombreOriginal);
  return `documentos/${tipo}/${uuid}_${nombreSanitizado}`;
}

module.exports = {
  sanitizarNombre,
  generarClave,
  TIPOS_VALIDOS,
};
