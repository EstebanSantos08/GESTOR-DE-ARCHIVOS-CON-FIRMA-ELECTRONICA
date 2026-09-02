/**
 * firma.service.js — Firma digital PAdES-BES real
 *
 * Correcciones respecto a la versión anterior:
 *
 *   Bug 1 — SubFilter: ahora usa ETSI.CAdES.detached (requerido por PAdES-BES)
 *            en vez de adbe.pkcs7.detached (sólo compatible con Adobe).
 *
 *   Bug 2 — CMS/PKCS#7: se reemplaza node-forge por pkijs para la construcción
 *            del SignedData, ya que node-forge no soporta el atributo firmado
 *            signingCertificateV2 (OID 1.2.840.113549.1.9.16.2.47), obligatorio
 *            en CAdES-BES. node-forge sigue usándose sólo para parsear el .p12.
 *
 *   Bug 3 — Firmas múltiples: pdf-lib siempre reconstruye el PDF completo,
 *            invalidando los /ByteRange de firmas previas. El sello visual sólo
 *            se estampa en la primera etapa del flujo (cuando el PDF aún no tiene
 *            ninguna firma). Las etapas 2-4 van directamente a placeholder → sign.
 */

'use strict';

const forge  = require('node-forge');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const QRCode = require('qrcode');
const fs     = require('fs');
const crypto = require('crypto');
const { webcrypto } = require('node:crypto');

const { plainAddPlaceholder }         = require('@signpdf/placeholder-plain');
const { SignPdf, Signer }             = require('@signpdf/signpdf');
const { SUBFILTER_ETSI_CADES_DETACHED } = require('@signpdf/utils');

// pkijs + asn1js para CAdES-BES real
const pkijs  = require('pkijs');
const asn1js = require('asn1js');

// ── Inicializar el motor criptográfico de pkijs con WebCrypto nativo de Node ──
pkijs.setEngine(
  'nodeEngine',
  new pkijs.CryptoEngine({ name: 'nodeEngine', crypto: webcrypto })
);

// ─── Constantes ───────────────────────────────────────────────────────────────
const SELLO_W          = 130;
const SELLO_H          = 150;
const MARGEN           = 18;
const SIGNATURE_LENGTH = 16384;   // bytes del placeholder /Contents (hex)

// OIDs usados en los atributos firmados CAdES
const OID_CONTENT_TYPE            = '1.2.840.113549.1.9.3';
const OID_MESSAGE_DIGEST          = '1.2.840.113549.1.9.4';
const OID_SIGNING_TIME            = '1.2.840.113549.1.9.5';
const OID_SIGNING_CERT_V2         = '1.2.840.113549.1.9.16.2.47';
const OID_DATA                    = '1.2.840.113549.1.7.1';
const OID_SHA256                  = '2.16.840.1.101.3.4.2.1';
const OID_RSA_SHA256              = '1.2.840.113549.1.1.11';  // sha256WithRSAEncryption
const OID_ECDSA_SHA256            = '1.2.840.10045.4.3.2';    // ecdsa-with-SHA256

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Posición horizontal del sello según el rol del firmante.
 *   RECTOR             → esquina inferior izquierda
 *   DECANO             → esquina inferior derecha
 *   DIRECTOR_CARRERA   → centro-izquierda (y bajo la mitad)
 *   SUBDECANO          → centro-derecha (y bajo la mitad)
 *   cualquier otro     → centrado
 */
function posicionSello(pageWidth, rol) {
  switch (rol) {
    case 'RECTOR':           return { x: MARGEN,                        y: MARGEN };
    case 'DECANO':           return { x: pageWidth - SELLO_W - MARGEN,  y: MARGEN };
    case 'DIRECTOR_CARRERA': return { x: (pageWidth - SELLO_W) / 2 - SELLO_W * 0.6, y: MARGEN };
    case 'SUBDECANO':        return { x: (pageWidth - SELLO_W) / 2 + SELLO_W * 0.6, y: MARGEN };
    default:                 return { x: (pageWidth - SELLO_W) / 2,     y: MARGEN };
  }
}


/**
 * Convierte una clave privada forge a un Buffer DER PKCS#8 sin cifrar,
 * que es el formato que acepta crypto.subtle.importKey('pkcs8', ...).
 *
 * @param {forge.pki.PrivateKey} forgeKey
 * @returns {Buffer}  DER PKCS#8
 */
function forgePrivKeyToPkcs8Der(forgeKey) {
  // forge.pki.privateKeyToAsn1() devuelve el ASN.1 del cuerpo de la clave
  // (PrivateKeyInfo para PKCS#8 si es RSA, o ECPrivateKey para EC).
  // Para envolverlo en PrivateKeyInfo usamos wrapRsaPrivateKey si es RSA.
  const keyAsn1 = forge.pki.privateKeyToAsn1(forgeKey);
  const pkcs8Asn1 = forge.pki.wrapRsaPrivateKey(keyAsn1);
  return Buffer.from(forge.asn1.toDer(pkcs8Asn1).getBytes(), 'binary');
}

/**
 * Convierte un certificado forge a Buffer DER.
 *
 * @param {forge.pki.Certificate} forgeCert
 * @returns {Buffer}
 */
function forgeCertToDer(forgeCert) {
  const certAsn1 = forge.pki.certificateToAsn1(forgeCert);
  return Buffer.from(forge.asn1.toDer(certAsn1).getBytes(), 'binary');
}

// ─── CadesSigner — construye el CMS SignedData conforme a CAdES-BES ──────────

/**
 * Implementación de Signer (@signpdf/signpdf) que usa pkijs + WebCrypto para
 * generar un CMS SignedData que cumple el perfil CAdES-BES:
 *
 *   - encapContentInfo detached (eContentType=id-data, sin eContent)
 *   - signedAttrs con: contentType, messageDigest, signingTime,
 *     signingCertificateV2 (OID 1.2.840.113549.1.9.16.2.47)
 *   - digestAlgorithm: SHA-256
 *   - signatureAlgorithm: sha256WithRSAEncryption (o ecdsa-with-SHA256)
 */
class CadesSigner extends Signer {
  /**
   * @param {forge.pki.PrivateKey}  forgeKey   Clave privada extraída del .p12
   * @param {forge.pki.Certificate} forgeCert  Certificado extraído del .p12
   */
  constructor(forgeKey, forgeCert) {
    super();
    this.forgeKey  = forgeKey;
    this.forgeCert = forgeCert;
  }

  /**
   * Genera el DER del CMS ContentInfo(SignedData) conforme a CAdES-BES.
   *
   * @param {Buffer} bytesParaFirmar  Bytes del ByteRange (los dos segmentos concatenados)
   * @param {Date}   [signingTime]    Fecha/hora de firma
   * @returns {Promise<Buffer>}       DER del CMS listo para insertar en /Contents
   */
  async sign(bytesParaFirmar, signingTime = new Date()) {
    // ── 1. Importar clave privada vía WebCrypto ────────────────────────────
    const pkcs8Der    = forgePrivKeyToPkcs8Der(this.forgeKey);
    // Detectar si la clave es RSA o EC para elegir el algoritmo correcto
    const isEC        = this.forgeKey.constructor.name === 'ECPrivateKey'
                     || (this.forgeKey.n === undefined); // RSA tiene .n

    const importAlgo  = isEC
      ? { name: 'ECDSA', namedCurve: 'P-256' }
      : { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };

    const privateKey  = await webcrypto.subtle.importKey(
      'pkcs8',
      pkcs8Der,
      importAlgo,
      false,
      ['sign']
    );

    const signAlgoOid = isEC ? OID_ECDSA_SHA256 : OID_RSA_SHA256;

    // ── 2. Certificado como pkijs.Certificate ─────────────────────────────
    const certDer     = forgeCertToDer(this.forgeCert);
    const certBer     = new Uint8Array(certDer).buffer;
    const certAsn1    = asn1js.fromBER(certBer);
    const pkijsCert   = new pkijs.Certificate({ schema: certAsn1.result });

    // ── 3. Hash del certificado DER para ESSCertIDv2 ──────────────────────
    const certHashBuf = await webcrypto.subtle.digest('SHA-256', certBer);
    const certHash    = new asn1js.OctetString({ valueHex: certHashBuf });

    // ── 4. Hash del contenido (message-digest) ────────────────────────────
    const msgDigestBuf = await webcrypto.subtle.digest('SHA-256', bytesParaFirmar);
    const msgDigest    = new asn1js.OctetString({ valueHex: msgDigestBuf });

    // ── 5. Construir los signedAttributes ─────────────────────────────────
    //
    // Orden obligatorio en CAdES: contentType, messageDigest, signingTime,
    // signingCertificateV2. Los atributos se codifican como SET OF Attribute
    // (DER canónico, orden por tag) antes de firmar.

    // 5a. contentType
    const attrContentType = new pkijs.Attribute({
      type: OID_CONTENT_TYPE,
      values: [new asn1js.ObjectIdentifier({ value: OID_DATA })],
    });

    // 5b. messageDigest
    const attrMsgDigest = new pkijs.Attribute({
      type: OID_MESSAGE_DIGEST,
      values: [msgDigest],
    });

    // 5c. signingTime — GeneralizedTime
    const signingTimeAsn1 = new asn1js.GeneralizedTime({ valueDate: signingTime });
    const attrSigningTime = new pkijs.Attribute({
      type: OID_SIGNING_TIME,
      values: [signingTimeAsn1],
    });

    // 5d. signingCertificateV2 — ESSCertIDv2 (RFC 5035)
    //
    // ESSCertIDv2 ::= SEQUENCE {
    //   hashAlgorithm  AlgorithmIdentifier  DEFAULT { algorithm id-sha256 },
    //   certHash       HASH,
    //   issuerSerial   IssuerSerial OPTIONAL
    // }
    // SigningCertificateV2 ::= SEQUENCE { certs SEQUENCE OF ESSCertIDv2 }
    //
    // Como el algoritmo de hash es SHA-256 (el DEFAULT), podemos omitir
    // hashAlgorithm para producir un DER más compacto, pero lo incluimos
    // explícitamente para mayor claridad e interoperabilidad.
    const hashAlgoId = new pkijs.AlgorithmIdentifier({
      algorithmId: OID_SHA256,
      // params: NULL explícito requerido por algunas implementaciones RSA
      algorithmParams: new asn1js.Null(),
    });

    const essCertIdV2 = new asn1js.Sequence({
      value: [
        hashAlgoId.toSchema(),
        certHash,
      ],
    });

    const signingCertV2Value = new asn1js.Sequence({
      value: [
        new asn1js.Sequence({ value: [essCertIdV2] }),
      ],
    });

    const attrSigningCertV2 = new pkijs.Attribute({
      type: OID_SIGNING_CERT_V2,
      values: [signingCertV2Value],
    });

    // ── 6. Construir SignerInfo ────────────────────────────────────────────
    const signerInfo = new pkijs.SignerInfo({
      version: new asn1js.Integer({ value: 1 }),
      sid: new pkijs.IssuerAndSerialNumber({
        issuer:       pkijsCert.issuer,
        serialNumber: pkijsCert.serialNumber,
      }),
      digestAlgorithm: new pkijs.AlgorithmIdentifier({
        algorithmId: OID_SHA256,
        algorithmParams: new asn1js.Null(),
      }),
      signedAttrs: new pkijs.SignedAndUnsignedAttributes({
        type: 0, // signedAttributes
        attributes: [
          attrContentType,
          attrMsgDigest,
          attrSigningTime,
          attrSigningCertV2,
        ],
      }),
      signatureAlgorithm: new pkijs.AlgorithmIdentifier({
        algorithmId: signAlgoOid,
        ...(isEC ? {} : { algorithmParams: new asn1js.Null() }),
      }),
      // signature se rellenará después de firmar (OCTET STRING en CMS RFC 5652)
      signature: new asn1js.OctetString({ valueHex: new ArrayBuffer(0) }),
    });

    // ── 7. Encodificar signedAttrs a DER para la operación de firma ───────
    //
    // PKCS#7 §9.3 y RFC 5652 §5.4: dentro de SignerInfo, signedAttrs lleva la
    // etiqueta de contexto [0] (0xA0). Pero la firma digital se calcula sobre
    // la codificación DER de ese mismo conjunto de atributos re-etiquetado
    // como SET OF universal (0x31).
    const signedAttrsSchema = signerInfo.signedAttrs.toSchema();
    signedAttrsSchema.idBlock.tagClass = 1;  // UNIVERSAL
    signedAttrsSchema.idBlock.tagNumber = 17; // SET
    const signedAttrsDer = signedAttrsSchema.toBER(false);

    // ── 8. Firmar ─────────────────────────────────────────────────────────
    const signAlgoParams = isEC
      ? { name: 'ECDSA', hash: { name: 'SHA-256' } }
      : { name: 'RSASSA-PKCS1-v1_5' };

    const rawSignature = await webcrypto.subtle.sign(
      signAlgoParams,
      privateKey,
      signedAttrsDer
    );

    // Actualizar la firma en el SignerInfo (OCTET STRING)
    signerInfo.signature = new asn1js.OctetString({ valueHex: rawSignature });

    // ── 9. Construir SignedData ────────────────────────────────────────────
    const signedData = new pkijs.SignedData({
      version: new asn1js.Integer({ value: 1 }),
      digestAlgorithms: [
        new pkijs.AlgorithmIdentifier({
          algorithmId: OID_SHA256,
          algorithmParams: new asn1js.Null(),
        }),
      ],
      encapContentInfo: new pkijs.EncapsulatedContentInfo({
        eContentType: OID_DATA,
        // Sin eContent → firma detached (requerido por PAdES)
      }),
      certificates: [pkijsCert],
      signerInfos: [signerInfo],
    });

    // ── 10. Envolver en ContentInfo y serializar ───────────────────────────
    const contentInfo = new pkijs.ContentInfo({
      contentType: pkijs.ContentInfo.SIGNED_DATA,
      content: signedData.toSchema(true),
    });

    const der = contentInfo.toSchema().toBER(false);
    return Buffer.from(der);
  }
}

// ─── FirmaService ─────────────────────────────────────────────────────────────

class FirmaService {
  /**
   * Lee un certificado .p12 y extrae la clave privada y el certificado público.
   * Sigue usando node-forge exclusivamente para el parseo del PKCS#12.
   *
   * @param {string} rutaP12
   * @param {string} password
   * @returns {{ clavePrivada: forge.pki.PrivateKey, certificado: forge.pki.Certificate }}
   */
  cargarCertificado(rutaP12, password) {
    const buffer  = fs.readFileSync(rutaP12);
    // toString('binary') evita el stack overflow de forge.util.binary.raw.encode
    // con Uint8Array grandes pasados a String.fromCharCode.apply()
    const p12Der  = buffer.toString('binary');
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12     = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

    const keyBags  = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const clavePrivada = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0]?.key;

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certificado = certBags[forge.pki.oids.certBag][0]?.cert;

    if (!clavePrivada || !certificado) {
      throw new Error('No se pudo extraer la clave o el certificado del archivo .p12');
    }

    return { clavePrivada, certificado };
  }

  /**
   * Genera un PNG de QR con los datos del firmante y fecha de emisión.
   *
   * @param {{ nombre: string, rol: string }} firmante
   * @param {Date} [fechaEmision]
   * @returns {Promise<Buffer>}
   */
  async generarQRPng(firmante, fechaEmision = new Date()) {
    const contenido = [
      `FIRMA DIGITAL PAdES-BES`,
      `Firmante: ${firmante.nombre || 'Pendiente'}`,
      `Cargo: ${firmante.rol || 'N/A'}`,
      `Fecha emisión: ${fechaEmision.toLocaleString('es-EC')}`,
      `Hash SHA-256: Generado en flujo de aprobación`,
    ].join('\n');

    return QRCode.toBuffer(contenido, {
      type: 'png',
      width: 256,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });
  }

  /**
   * Prepara el PDF estampando visualmente todos los sellos QR/texto de los firmantes
   * programados para el documento de una sola vez, antes de que entre al flujo de firmas.
   * Se ejecuta una única vez sobre el PDF original.
   *
   * @param {Buffer} pdfBuffer - Buffer del PDF original
   * @param {Array<{ nombre: string, rol: string }>} arrayFirmantes - Arreglo de firmantes programados
   * @param {Date} [fechaEmision] - Fecha de emisión del documento
   * @returns {Promise<Buffer>} - Buffer del PDF con todos los sellos visuales
   */
  async prepararDocumento(pdfBuffer, arrayFirmantes = [], fechaEmision = new Date()) {
    const pdfDoc     = await PDFDocument.load(pdfBuffer);
    const paginas    = pdfDoc.getPages();
    const ultimaPag  = paginas[paginas.length - 1];
    const font       = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const { width }  = ultimaPag.getSize();

    for (const firmante of arrayFirmantes) {
      const { x, y } = posicionSello(width, firmante.rol);

      // ── Fondo y borde del sello ─────────────────────────────────────────
      ultimaPag.drawRectangle({
        x, y,
        width: SELLO_W,
        height: SELLO_H,
        borderColor: rgb(0.06, 0.13, 0.37),
        borderWidth: 1.2,
        color: rgb(0.96, 0.97, 1.0),
      });

      // ── Título ──────────────────────────────────────────────────────────
      ultimaPag.drawText('FIRMA DIGITAL', {
        x: x + 18, y: y + SELLO_H - 13,
        size: 7.5, font,
        color: rgb(0.06, 0.13, 0.37),
      });

      // ── QR ──────────────────────────────────────────────────────────────
      const qrPng   = await this.generarQRPng(firmante, fechaEmision);
      const qrImage = await pdfDoc.embedPng(qrPng);
      const qrSize  = 70;
      ultimaPag.drawImage(qrImage, {
        x: x + (SELLO_W - qrSize) / 2,
        y: y + SELLO_H - 14 - qrSize,
        width: qrSize, height: qrSize,
      });

      // ── Texto bajo el QR ───────────────────────────────────────────────
      const textoY = y + SELLO_H - 14 - qrSize - 12;
      const nombreTruncado = firmante.nombre && firmante.nombre.length > 20
        ? firmante.nombre.substring(0, 18) + '…'
        : (firmante.nombre || 'Pendiente');

      ultimaPag.drawText(nombreTruncado, { x: x + 5, y: textoY,      size: 6.5, font,        color: rgb(0.1,  0.1,  0.1)  });
      ultimaPag.drawText(firmante.rol || '', { x: x + 5, y: textoY - 10, size: 6, font: fontNormal, color: rgb(0.3, 0.3, 0.3) });
      ultimaPag.drawText(fechaEmision.toLocaleDateString('es-EC'),
                                         { x: x + 5, y: textoY - 20, size: 6,   font: fontNormal, color: rgb(0.3,  0.3,  0.3)  });
      ultimaPag.drawText('PAdES-BES · Verif. QR',
                                         { x: x + 5, y: textoY - 30, size: 5.5, font: fontNormal, color: rgb(0.55, 0.55, 0.55) });
    }

    // useObjectStreams: false para compatibilidad con plainAddPlaceholder
    return Buffer.from(await pdfDoc.save({ useObjectStreams: false }));
  }

  /**
   * Helper para estampar el sello de un único firmante (alias retrocompatible).
   *
   * @param {Buffer} pdfBuffer
   * @param {{ nombre: string, rol: string }} firmante
   * @param {Date} [fechaEmision]
   * @returns {Promise<Buffer>}
   */
  async agregarSelloVisual(pdfBuffer, firmante, fechaEmision = new Date()) {
    return this.prepararDocumento(pdfBuffer, [firmante], fechaEmision);
  }

  /**
   * Pipeline de firma PAdES-BES estrictamente criptográfico.
   *
   * Asume que el PDF en `rutaPdf` ya tiene todos los sellos visuales estampados
   * previamente mediante `prepararDocumento`. Nunca invoca pdf-lib ni altera
   * la estructura de bytes previa, preservando la integridad de firmas anteriores.
   *
   * Operaciones:
   *   1. Inyecta placeholder AcroForm /Sig con SubFilter ETSI.CAdES.detached
   *   2. Firma criptográficamente con CadesSigner (CMS SignedData CAdES-BES)
   *
   * @param {{ rutaPdf: string, rutaCertP12: string, passwordCert: string,
   *            firmante: { nombre: string, rol: string } }} opciones
   * @returns {Promise<{ pdfFirmado: Buffer, firmaDer: null,
   *                     hashSha256: string, fechaFirma: Date,
   *                     firmante: string }>}
   */
  async firmarDocumento({ rutaPdf, rutaCertP12, passwordCert, firmante }) {
    const { clavePrivada, certificado } = this.cargarCertificado(rutaCertP12, passwordCert);

    const pdfOriginal = fs.readFileSync(rutaPdf);
    const fechaFirma  = new Date();

    // ── Insertar placeholder /Sig con SubFilter ETSI.CAdES.detached ─────
    const pdfConPlaceholder = plainAddPlaceholder({
      pdfBuffer:       pdfOriginal,
      reason:          `Firma digital PAdES-BES — ${firmante.rol}`,
      contactInfo:     firmante.nombre,
      name:            firmante.nombre,
      location:        'Ecuador',
      signatureLength: SIGNATURE_LENGTH,
      subFilter:       SUBFILTER_ETSI_CADES_DETACHED,
    });

    // ── Firma criptográfica CAdES-BES con pkijs ───────────────────────────
    const signpdf    = new SignPdf();
    const signer     = new CadesSigner(clavePrivada, certificado);
    const pdfFirmado = await signpdf.sign(pdfConPlaceholder, signer, fechaFirma);

    const hashSha256 = crypto.createHash('sha256').update(pdfFirmado).digest('hex');

    return {
      pdfFirmado,
      firmaDer: null,
      hashSha256,
      fechaFirma,
      firmante: certificado.subject.getField('CN')?.value || firmante.nombre,
    };
  }

  /**
   * Calcula el hash SHA-256 de un Buffer.
   * @param {Buffer} buffer
   * @returns {string} hex digest
   */
  calcularHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}

module.exports = new FirmaService();
