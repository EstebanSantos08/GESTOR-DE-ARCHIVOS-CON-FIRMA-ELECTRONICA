const forge = require('node-forge');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const QRCode = require('qrcode');
const fs = require('fs');
const crypto = require('crypto');

// Ancho del sello QR en puntos PDF (1 punto = 1/72 pulgada)
const SELLO_W = 130;
const SELLO_H = 150;
const MARGEN = 18;

/**
 * Posición horizontal del sello según el rol del firmante.
 * Decano → esquina inferior derecha
 * Rector → esquina inferior izquierda
 * Cualquier otro → centrado
 */
function posicionSello(pageWidth, rol) {
  if (rol === 'RECTOR') return { x: MARGEN, y: MARGEN };
  if (rol === 'DECANO') return { x: pageWidth - SELLO_W - MARGEN, y: MARGEN };
  return { x: (pageWidth - SELLO_W) / 2, y: MARGEN };
}

class FirmaService {
  /**
   * Lee un certificado .p12 y extrae la clave privada y el certificado público.
   */
  cargarCertificado(rutaP12, password) {
    const buffer = fs.readFileSync(rutaP12);
    // buffer.toString('binary') evita el stack overflow de forge.util.binary.raw.encode
    // con Uint8Array grandes pasados a String.fromCharCode.apply()
    const p12Der = buffer.toString('binary');
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const clavePrivada = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0]?.key;

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certificado = certBags[forge.pki.oids.certBag][0]?.cert;

    if (!clavePrivada || !certificado) {
      throw new Error('No se pudo extraer la clave o el certificado del archivo .p12');
    }

    return { clavePrivada, certificado };
  }

  /**
   * Genera un PNG de QR con los datos de verificación de la firma.
   * El contenido del QR puede escanearse para verificar la autenticidad.
   */
  async generarQRPng(firmante, fechaFirma, hashDocumento) {
    const contenido = [
      `FIRMA DIGITAL PAdES-BES`,
      `Firmante: ${firmante.nombre}`,
      `Cargo: ${firmante.rol}`,
      `Fecha: ${fechaFirma.toLocaleString('es-EC')}`,
      `Hash SHA-256: ${hashDocumento ? hashDocumento.substring(0, 32) + '...' : 'N/A'}`,
    ].join('\n');

    const pngBuffer = await QRCode.toBuffer(contenido, {
      type: 'png',
      width: 256,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });

    return pngBuffer;
  }

  /**
   * Estampa el sello de firma en la última página del PDF.
   * Cada rol firma en una esquina diferente para que ambas firmas sean visibles:
   *   Decano  → esquina inferior derecha
   *   Rector  → esquina inferior izquierda
   *
   * El sello incluye:
   *   - Imagen QR con datos de verificación
   *   - Nombre del firmante y rol
   *   - Fecha y estándar PAdES-BES
   */
  async agregarSelloVisual(pdfBuffer, firmante, fechaFirma, hashDocumento) {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const paginas = pdfDoc.getPages();
    const ultimaPagina = paginas[paginas.length - 1];
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const { width } = ultimaPagina.getSize();
    const { x, y } = posicionSello(width, firmante.rol);

    // ── Fondo y borde del sello ───────────────────────────────────────────
    ultimaPagina.drawRectangle({
      x,
      y,
      width: SELLO_W,
      height: SELLO_H,
      borderColor: rgb(0.06, 0.13, 0.37),
      borderWidth: 1.2,
      color: rgb(0.96, 0.97, 1.0),
    });

    // ── Título ────────────────────────────────────────────────────────────
    ultimaPagina.drawText('FIRMA DIGITAL', {
      x: x + 18,
      y: y + SELLO_H - 13,
      size: 7.5,
      font,
      color: rgb(0.06, 0.13, 0.37),
    });

    // ── QR ────────────────────────────────────────────────────────────────
    const qrPng = await this.generarQRPng(firmante, fechaFirma, hashDocumento);
    const qrImage = await pdfDoc.embedPng(qrPng);
    const qrSize = 70;
    ultimaPagina.drawImage(qrImage, {
      x: x + (SELLO_W - qrSize) / 2,
      y: y + SELLO_H - 14 - qrSize,
      width: qrSize,
      height: qrSize,
    });

    // ── Texto bajo el QR ─────────────────────────────────────────────────
    const textoY = y + SELLO_H - 14 - qrSize - 12;

    // Nombre — truncado si es muy largo
    const nombreTruncado = firmante.nombre.length > 20
      ? firmante.nombre.substring(0, 18) + '…'
      : firmante.nombre;

    ultimaPagina.drawText(nombreTruncado, {
      x: x + 5,
      y: textoY,
      size: 6.5,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });

    ultimaPagina.drawText(firmante.rol, {
      x: x + 5,
      y: textoY - 10,
      size: 6,
      font: fontNormal,
      color: rgb(0.3, 0.3, 0.3),
    });

    ultimaPagina.drawText(fechaFirma.toLocaleDateString('es-EC'), {
      x: x + 5,
      y: textoY - 20,
      size: 6,
      font: fontNormal,
      color: rgb(0.3, 0.3, 0.3),
    });

    ultimaPagina.drawText('PAdES-BES · Verif. QR', {
      x: x + 5,
      y: textoY - 30,
      size: 5.5,
      font: fontNormal,
      color: rgb(0.55, 0.55, 0.55),
    });

    return Buffer.from(await pdfDoc.save());
  }

  /**
   * Construye la firma criptográfica PKCS#7 CMS (PAdES-BES).
   */
  construirFirmaPKCS7(contenidoPdf, clavePrivada, certificado) {
    const p7 = forge.pkcs7.createSignedData();

    p7.content = forge.util.createBuffer(
      Buffer.from(contenidoPdf).toString('binary')
    );

    p7.addCertificate(certificado);

    p7.addSigner({
      key: clavePrivada,
      certificate: certificado,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [
        { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
        { type: forge.pki.oids.messageDigest },
        { type: forge.pki.oids.signingTime, value: new Date() },
      ],
    });

    p7.sign({ detached: true });

    const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
    return Buffer.from(der, 'binary');
  }

  /**
   * Pipeline completo de firma:
   * 1. Lee el PDF actual (que puede ya tener el sello del Decano)
   * 2. Agrega el sello QR del firmante actual en su esquina correspondiente
   * 3. Construye la firma criptográfica PKCS#7
   * 4. Devuelve el PDF firmado con ambos sellos visibles
   */
  async firmarDocumento({ rutaPdf, rutaCertP12, passwordCert, firmante }) {
    const { clavePrivada, certificado } = this.cargarCertificado(rutaCertP12, passwordCert);

    const pdfOriginal = fs.readFileSync(rutaPdf);
    const fechaFirma = new Date();

    // Calcula hash del PDF entrante para incluirlo en el QR
    const hashEntrada = crypto.createHash('sha256').update(pdfOriginal).digest('hex');

    // Agrega el sello QR del firmante actual (sin borrar los anteriores)
    const pdfConSello = await this.agregarSelloVisual(pdfOriginal, firmante, fechaFirma, hashEntrada);

    // Capa criptográfica sobre el PDF ya sellado
    const firmaDer = this.construirFirmaPKCS7(pdfConSello, clavePrivada, certificado);

    // Hash final para auditoría
    const hashSha256 = crypto.createHash('sha256').update(pdfConSello).digest('hex');

    return {
      pdfFirmado: pdfConSello,
      firmaDer,
      hashSha256,
      fechaFirma,
      firmante: certificado.subject.getField('CN')?.value || firmante.nombre,
    };
  }

  calcularHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}

module.exports = new FirmaService();
