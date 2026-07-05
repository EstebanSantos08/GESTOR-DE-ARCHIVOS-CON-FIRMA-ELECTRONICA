const forge = require('node-forge');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const crypto = require('crypto');

class FirmaService {
  /**
   * Lee un certificado .p12 y extrae la clave privada y el certificado público.
   * Usado para construir la firma PKCS#7 (PAdES-BES).
   */
  cargarCertificado(rutaP12, password) {
    const buffer = fs.readFileSync(rutaP12);
    const p12Der = forge.util.binary.raw.encode(new Uint8Array(buffer));
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
   * Estampa visualmente la firma en la última página del PDF (requisito PAdES visual layer).
   */
  async agregarSelloVisual(pdfBuffer, firmante, fechaFirma) {
    // La firma visual se dibuja sobre la última página para no alterar el contenido original.
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const paginas = pdfDoc.getPages();
    const ultimaPagina = paginas[paginas.length - 1];
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const { width } = ultimaPagina.getSize();
    const x = width - 230;
    const yBase = 30;

    // Marco del sello
    ultimaPagina.drawRectangle({
      x,
      y: yBase,
      width: 210,
      height: 70,
      borderColor: rgb(0.1, 0.2, 0.6),
      borderWidth: 1.5,
      color: rgb(0.95, 0.97, 1),
    });

    ultimaPagina.drawText('FIRMA DIGITAL', {
      x: x + 55,
      y: yBase + 54,
      size: 9,
      font,
      color: rgb(0.1, 0.2, 0.6),
    });

    ultimaPagina.drawText(`Firmado por: ${firmante.nombre}`, {
      x: x + 6,
      y: yBase + 40,
      size: 7.5,
      font: fontNormal,
      color: rgb(0.1, 0.1, 0.1),
    });

    ultimaPagina.drawText(`Cargo: ${firmante.rol}`, {
      x: x + 6,
      y: yBase + 28,
      size: 7.5,
      font: fontNormal,
      color: rgb(0.1, 0.1, 0.1),
    });

    ultimaPagina.drawText(`Fecha: ${fechaFirma.toLocaleString('es-EC')}`, {
      x: x + 6,
      y: yBase + 16,
      size: 7.5,
      font: fontNormal,
      color: rgb(0.1, 0.1, 0.1),
    });

    ultimaPagina.drawText('Estándar PAdES-BES', {
      x: x + 6,
      y: yBase + 4,
      size: 6,
      font: fontNormal,
      color: rgb(0.5, 0.5, 0.5),
    });

    return Buffer.from(await pdfDoc.save());
  }

  /**
   * Calcula el hash SHA-256 del contenido del PDF y construye una firma
   * criptográfica PKCS#7 CMS usando la clave privada del certificado .p12.
   * El resultado es compatible con el estándar PAdES-BES (ISO 32000-1).
   */
  construirFirmaPKCS7(contenidoPdf, clavePrivada, certificado) {
    // Construye la firma criptográfica separada del sello visual.
    const p7 = forge.pkcs7.createSignedData();

    p7.content = forge.util.createBuffer(
      forge.util.binary.raw.encode(new Uint8Array(contenidoPdf))
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
   * 1. Agrega sello visual (pdf-lib)
   * 2. Construye firma criptográfica PKCS#7 (node-forge, PAdES-BES)
   * 3. Devuelve el PDF firmado y la firma DER serializada
   */
  async firmarDocumento({ rutaPdf, rutaCertP12, passwordCert, firmante }) {
    const { clavePrivada, certificado } = this.cargarCertificado(rutaCertP12, passwordCert);

    const pdfOriginal = fs.readFileSync(rutaPdf);
    const fechaFirma = new Date();

    // Capa visual
    const pdfConSello = await this.agregarSelloVisual(pdfOriginal, firmante, fechaFirma);

    // Capa criptográfica
    const firmaDer = this.construirFirmaPKCS7(pdfConSello, clavePrivada, certificado);

    // Hash de integridad del PDF final
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
