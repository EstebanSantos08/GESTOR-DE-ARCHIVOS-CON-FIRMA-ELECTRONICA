/**
 * firma-pades.test.js — Validación automática de firmas PAdES-BES
 *
 * Verifica los 3 bugs corregidos en firma.service.js:
 *
 *   Bug 1 — SubFilter: /SubFilter debe ser exactamente ETSI.CAdES.detached
 *   Bug 2 — CAdES-BES: signedAttrs debe contener el OID 1.2.840.113549.1.9.16.2.47
 *            (signingCertificateV2) y el messageDigest debe coincidir con los bytes.
 *            Además, crypto.verify() confirma que la firma RSA fue calculada
 *            sobre los signedAttrs re-etiquetados como SET OF universal (0x31).
 *   Bug 3 — Firmas múltiples: la firma de la etapa 1 debe permanecer criptográficamente
 *            válida después de que la etapa 2 firme (su messageDigest y firma RSA
 *            se preservan intactos).
 */

'use strict';

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const forge  = require('node-forge');
const { PDFDocument } = require('pdf-lib');
const asn1js = require('asn1js');
const pkijs  = require('pkijs');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Genera un par RSA-2048 self-signed con node-forge.
 * Devuelve el .p12 como Buffer y el certificado en PEM para validación criptográfica.
 *
 * @param {string} cn  CommonName del certificado
 * @returns {{ p12Buffer: Buffer, password: string, certPem: string }}
 */
function generarCertificadoP12(cn) {
  const keypair = forge.pki.rsa.generateKeyPair(2048);
  const cert    = forge.pki.createCertificate();
  cert.publicKey = keypair.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter  = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 2);

  const attrs = [{ name: 'commonName', value: cn }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keypair.privateKey, forge.md.sha256.create());

  const password = 'test1234';
  const p12Asn1  = forge.pkcs12.toPkcs12Asn1(
    keypair.privateKey,
    [cert],
    password,
    { algorithm: '3des' }
  );
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  return {
    p12Buffer: Buffer.from(p12Der, 'binary'),
    password,
    certPem: forge.pki.certificateToPem(cert),
  };
}

/**
 * Crea un PDF mínimo válido con una página en blanco.
 * @returns {Promise<Buffer>}
 */
async function crearPdfMinimo() {
  const doc = await PDFDocument.create();
  doc.addPage([595, 842]); // A4
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}

/**
 * Extrae todas las firmas del PDF parseando directamente la estructura binaria.
 * Para cada firma devuelve:
 *   - subFilter: string con el valor de /SubFilter
 *   - cmsDer: Buffer con el DER decodificado del campo /Contents
 *   - byteRanges: [start1, len1, start2, len2]
 *   - signedBytes: Buffer con los bytes cubiertos por el /ByteRange
 *   - si: pkijs.SignerInfo parseado del CMS
 *
 * @param {Buffer} pdfBuf
 * @returns {Array<{ subFilter: string, cmsDer: Buffer, byteRanges: number[], signedBytes: Buffer, si: pkijs.SignerInfo }>}
 */
function extraerFirmasDelPdf(pdfBuf) {
  const texto  = pdfBuf.toString('latin1');
  const firmas = [];

  const byteRangeRe = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g;
  let match;

  while ((match = byteRangeRe.exec(texto)) !== null) {
    const byteRanges = [
      parseInt(match[1], 10),
      parseInt(match[2], 10),
      parseInt(match[3], 10),
      parseInt(match[4], 10),
    ];

    // /SubFilter en el entorno del diccionario /Sig
    const contexto = texto.slice(Math.max(0, match.index - 500), match.index + 500);
    const sfMatch  = /\/SubFilter\s*\/([^\s\/\>]+)/.exec(contexto);
    const subFilter = sfMatch ? sfMatch[1] : '(no encontrado)';

    // En PDF, los bytes entre byteRanges[0]+byteRanges[1] y byteRanges[2] son <hex_contents>
    const hexGap = pdfBuf.slice(byteRanges[0] + byteRanges[1], byteRanges[2]).toString('latin1');
    const rawHex = hexGap.replace(/^</, '').replace(/(?:00|>)+$/, '');
    const cmsDer = Buffer.from(rawHex, 'hex');

    // Bytes reales cubiertos por el ByteRange
    const signedBytes = Buffer.concat([
      pdfBuf.slice(byteRanges[0], byteRanges[0] + byteRanges[1]),
      pdfBuf.slice(byteRanges[2], byteRanges[2] + byteRanges[3]),
    ]);

    // Parsear CMS DER
    const asn1 = asn1js.fromBER(cmsDer.buffer.slice(cmsDer.byteOffset, cmsDer.byteOffset + cmsDer.byteLength));
    let si = null;
    if (asn1.offset !== -1) {
      const ci = new pkijs.ContentInfo({ schema: asn1.result });
      const sd = new pkijs.SignedData({ schema: ci.content });
      si = sd.signerInfos[0];
    }

    firmas.push({ subFilter, cmsDer, byteRanges, signedBytes, si });
  }

  return firmas;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const PDF_PRUEBA   = path.join(FIXTURES_DIR, 'prueba.pdf');
const P12_DIR1     = path.join(FIXTURES_DIR, 'director.p12');
const P12_DIR2     = path.join(FIXTURES_DIR, 'subdecano.p12');
const P12_DIR3     = path.join(FIXTURES_DIR, 'decano.p12');
const P12_DIR4     = path.join(FIXTURES_DIR, 'rector.p12');
const PDF_FIRMADO1 = path.join(FIXTURES_DIR, 'firmado_etapa1.pdf');
const PDF_FIRMADO2 = path.join(FIXTURES_DIR, 'firmado_etapa2.pdf');
const PDF_FIRMADO3 = path.join(FIXTURES_DIR, 'firmado_etapa3.pdf');
const PDF_FIRMADO4 = path.join(FIXTURES_DIR, 'firmado_etapa4.pdf');

// ─── Tests ────────────────────────────────────────────────────────────────────

jest.setTimeout(180000);

describe('PAdES-BES — firma.service.js (4 Firmantes: Director, Subdecano, Decano, Rector)', () => {
  let firmaService;
  let passDir1, passDir2, passDir3, passDir4;
  let certPemDir1, certPemDir2, certPemDir3, certPemDir4;

  beforeAll(async () => {
    firmaService = require('../Services/firma.service');

    if (!fs.existsSync(FIXTURES_DIR)) {
      fs.mkdirSync(FIXTURES_DIR, { recursive: true });
    }

    // 1. Certificado Director de Carrera
    const cert1 = generarCertificadoP12('Director Carrera Test');
    fs.writeFileSync(P12_DIR1, cert1.p12Buffer);
    passDir1    = cert1.password;
    certPemDir1 = cert1.certPem;

    // 2. Certificado Subdecano
    const cert2 = generarCertificadoP12('Subdecano Test');
    fs.writeFileSync(P12_DIR2, cert2.p12Buffer);
    passDir2    = cert2.password;
    certPemDir2 = cert2.certPem;

    // 3. Certificado Decano
    const cert3 = generarCertificadoP12('Decano Test');
    fs.writeFileSync(P12_DIR3, cert3.p12Buffer);
    passDir3    = cert3.password;
    certPemDir3 = cert3.certPem;

    // 4. Certificado Rector
    const cert4 = generarCertificadoP12('Rector Test');
    fs.writeFileSync(P12_DIR4, cert4.p12Buffer);
    passDir4    = cert4.password;
    certPemDir4 = cert4.certPem;

    // PDF mínimo preparado visualmente con los 4 sellos
    const pdfBuf = await crearPdfMinimo();
    const pdfPreparado = await firmaService.prepararDocumento(pdfBuf, [
      { nombre: 'Director Carrera Test', rol: 'DIRECTOR_CARRERA' },
      { nombre: 'Subdecano Test', rol: 'SUBDECANO' },
      { nombre: 'Decano Test', rol: 'DECANO' },
      { nombre: 'Rector Test', rol: 'RECTOR' },
    ]);
    fs.writeFileSync(PDF_PRUEBA, pdfPreparado);
  });

  afterAll(() => {
    for (const f of [
      P12_DIR1, P12_DIR2, P12_DIR3, P12_DIR4,
      PDF_PRUEBA, PDF_FIRMADO1, PDF_FIRMADO2, PDF_FIRMADO3, PDF_FIRMADO4
    ]) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch {
        // Ignorar locks temporales de Windows en el teardown
      }
    }
  });

  // ── Preparación visual ──────────────────────────────────────────────────
  describe('Preparación visual de los 4 sellos', () => {
    test('prepararDocumento estampa los 4 sellos visuales antes de firmar', async () => {
      const pdfPreparado = fs.readFileSync(PDF_PRUEBA);
      expect(pdfPreparado.length).toBeGreaterThan(1000);
      const pdfDoc = await PDFDocument.load(pdfPreparado);
      expect(pdfDoc.getPageCount()).toBe(1);
    });
  });

  // ── Etapa 1: primer firmante (Director de Carrera) ──────────────────────
  describe('Etapa 1 — Director de Carrera', () => {
    let pdfFirmado1;

    beforeAll(async () => {
      const resultado = await firmaService.firmarDocumento({
        rutaPdf:      PDF_PRUEBA,
        rutaCertP12:  P12_DIR1,
        passwordCert: passDir1,
        firmante:     { nombre: 'Director Carrera Test', rol: 'DIRECTOR_CARRERA' },
      });
      pdfFirmado1 = resultado.pdfFirmado;
      fs.writeFileSync(PDF_FIRMADO1, pdfFirmado1);
    });

    test('devuelve un Buffer no vacío', () => {
      expect(Buffer.isBuffer(pdfFirmado1)).toBe(true);
      expect(pdfFirmado1.length).toBeGreaterThan(100);
    });

    test('el PDF contiene exactamente 1 firma', () => {
      const firmas = extraerFirmasDelPdf(pdfFirmado1);
      expect(firmas).toHaveLength(1);
    });

    test('Bug 1 — /SubFilter es exactamente ETSI.CAdES.detached', () => {
      const [firma] = extraerFirmasDelPdf(pdfFirmado1);
      expect(firma.subFilter).toBe('ETSI.CAdES.detached');
    });

    test('Bug 2 — el CMS contiene el atributo signingCertificateV2 (OID 1.2.840.113549.1.9.16.2.47)', () => {
      const [firma] = extraerFirmasDelPdf(pdfFirmado1);
      expect(firma.si).not.toBeNull();
      const hasEss = firma.si.signedAttrs.attributes.some(
        a => a.type === '1.2.840.113549.1.9.16.2.47'
      );
      expect(hasEss).toBe(true);
    });

    test('el messageDigest coincide exactamente con el SHA-256 de los bytes del ByteRange', () => {
      const [firma] = extraerFirmasDelPdf(pdfFirmado1);
      const msgDigestAttr = firma.si.signedAttrs.attributes.find(
        a => a.type === '1.2.840.113549.1.9.4'
      );
      expect(msgDigestAttr).toBeDefined();
      const embeddedDigest = Buffer.from(msgDigestAttr.values[0].valueBlock.valueHexView).toString('hex');
      const realDigest     = crypto.createHash('sha256').update(firma.signedBytes).digest('hex');

      expect(embeddedDigest).toBe(realDigest);
    });

    test('la firma RSA es criptográficamente válida sobre los signedAttrs re-etiquetados a 0x31', () => {
      const [firma] = extraerFirmasDelPdf(pdfFirmado1);

      const cmsSignedAttrsBer = Buffer.from(firma.si.signedAttrs.toSchema().toBER(false));
      const verifyAttrsBuf    = Buffer.from(cmsSignedAttrsBer);
      verifyAttrsBuf[0]       = 0x31;

      const sigBytes = Buffer.from(firma.si.signature.valueBlock.valueHexView);
      const isValid  = crypto.verify('RSA-SHA256', verifyAttrsBuf, certPemDir1, sigBytes);

      expect(isValid).toBe(true);
    });
  });

  // ── Etapa 2: segundo firmante (Subdecano) sobre PDF_FIRMADO1 ────────────
  describe('Etapa 2 — Subdecano (sobre PDF ya firmado por Director)', () => {
    let pdfFirmado2;

    beforeAll(async () => {
      const resultado = await firmaService.firmarDocumento({
        rutaPdf:      PDF_FIRMADO1,
        rutaCertP12:  P12_DIR2,
        passwordCert: passDir2,
        firmante:     { nombre: 'Subdecano Test', rol: 'SUBDECANO' },
      });
      pdfFirmado2 = resultado.pdfFirmado;
      fs.writeFileSync(PDF_FIRMADO2, pdfFirmado2);
    });

    test('devuelve un Buffer no vacío', () => {
      expect(Buffer.isBuffer(pdfFirmado2)).toBe(true);
      expect(pdfFirmado2.length).toBeGreaterThan(100);
    });

    test('el PDF contiene exactamente 2 firmas independientes', () => {
      const firmas = extraerFirmasDelPdf(pdfFirmado2);
      expect(firmas).toHaveLength(2);
    });

    describe('Firma 1 (Director) — permanece intacta y válida tras la segunda firma', () => {
      test('Bug 1 — /SubFilter sigue siendo ETSI.CAdES.detached', () => {
        const firmas = extraerFirmasDelPdf(pdfFirmado2);
        expect(firmas[0].subFilter).toBe('ETSI.CAdES.detached');
      });

      test('Bug 2 — contiene el atributo signingCertificateV2', () => {
        const firmas = extraerFirmasDelPdf(pdfFirmado2);
        const hasEss = firmas[0].si.signedAttrs.attributes.some(
          a => a.type === '1.2.840.113549.1.9.16.2.47'
        );
        expect(hasEss).toBe(true);
      });

      test('Bug 3 — messageDigest sigue coincidiendo intacto', () => {
        const firmas = extraerFirmasDelPdf(pdfFirmado2);
        const firma1 = firmas[0];
        const msgDigestAttr = firma1.si.signedAttrs.attributes.find(
          a => a.type === '1.2.840.113549.1.9.4'
        );
        const embeddedDigest = Buffer.from(msgDigestAttr.values[0].valueBlock.valueHexView).toString('hex');
        const realDigest     = crypto.createHash('sha256').update(firma1.signedBytes).digest('hex');

        expect(embeddedDigest).toBe(realDigest);
      });

      test('firma RSA de etapa 1 sigue verificando con clave pública del Director', () => {
        const firmas = extraerFirmasDelPdf(pdfFirmado2);
        const firma1 = firmas[0];

        const cmsSignedAttrsBer = Buffer.from(firma1.si.signedAttrs.toSchema().toBER(false));
        const verifyAttrsBuf    = Buffer.from(cmsSignedAttrsBer);
        verifyAttrsBuf[0]       = 0x31;

        const sigBytes = Buffer.from(firma1.si.signature.valueBlock.valueHexView);
        const isValid  = crypto.verify('RSA-SHA256', verifyAttrsBuf, certPemDir1, sigBytes);

        expect(isValid).toBe(true);
      });
    });

    describe('Firma 2 (Subdecano)', () => {
      test('Bug 1 — /SubFilter es ETSI.CAdES.detached', () => {
        const firmas = extraerFirmasDelPdf(pdfFirmado2);
        expect(firmas[1].subFilter).toBe('ETSI.CAdES.detached');
      });

      test('Bug 2 — contiene el atributo signingCertificateV2', () => {
        const firmas = extraerFirmasDelPdf(pdfFirmado2);
        const hasEss = firmas[1].si.signedAttrs.attributes.some(
          a => a.type === '1.2.840.113549.1.9.16.2.47'
        );
        expect(hasEss).toBe(true);
      });

      test('messageDigest coincide con SHA-256 de los bytes del segundo ByteRange', () => {
        const firmas = extraerFirmasDelPdf(pdfFirmado2);
        const firma2 = firmas[1];
        const msgDigestAttr = firma2.si.signedAttrs.attributes.find(
          a => a.type === '1.2.840.113549.1.9.4'
        );
        const embeddedDigest = Buffer.from(msgDigestAttr.values[0].valueBlock.valueHexView).toString('hex');
        const realDigest     = crypto.createHash('sha256').update(firma2.signedBytes).digest('hex');

        expect(embeddedDigest).toBe(realDigest);
      });

      test('firma RSA de etapa 2 verifica con clave pública del Subdecano', () => {
        const firmas = extraerFirmasDelPdf(pdfFirmado2);
        const firma2 = firmas[1];

        const cmsSignedAttrsBer = Buffer.from(firma2.si.signedAttrs.toSchema().toBER(false));
        const verifyAttrsBuf    = Buffer.from(cmsSignedAttrsBer);
        verifyAttrsBuf[0]       = 0x31;

        const sigBytes = Buffer.from(firma2.si.signature.valueBlock.valueHexView);
        const isValid  = crypto.verify('RSA-SHA256', verifyAttrsBuf, certPemDir2, sigBytes);

        expect(isValid).toBe(true);
      });
    });
  });

  // ── Etapa 3: tercer firmante (Decano) sobre PDF_FIRMADO2 ─────────────────
  describe('Etapa 3 — Decano (sobre PDF ya firmado por Director y Subdecano)', () => {
    let pdfFirmado3;

    beforeAll(async () => {
      const resultado = await firmaService.firmarDocumento({
        rutaPdf:      PDF_FIRMADO2,
        rutaCertP12:  P12_DIR3,
        passwordCert: passDir3,
        firmante:     { nombre: 'Decano Test', rol: 'DECANO' },
      });
      pdfFirmado3 = resultado.pdfFirmado;
      fs.writeFileSync(PDF_FIRMADO3, pdfFirmado3);
    });

    test('devuelve un Buffer no vacío', () => {
      expect(Buffer.isBuffer(pdfFirmado3)).toBe(true);
      expect(pdfFirmado3.length).toBeGreaterThan(100);
    });

    test('el PDF contiene exactamente 3 firmas independientes', () => {
      const firmas = extraerFirmasDelPdf(pdfFirmado3);
      expect(firmas).toHaveLength(3);
    });

    describe('Firmas previas (1 Director, 2 Subdecano) — permanecen intactas', () => {
      test('Firma 1 (Director) permanece 100% válida tras la tercera firma', () => {
        const firmas = extraerFirmasDelPdf(pdfFirmado3);
        const f1 = firmas[0];
        expect(f1.subFilter).toBe('ETSI.CAdES.detached');

        const msgDigestAttr = f1.si.signedAttrs.attributes.find(a => a.type === '1.2.840.113549.1.9.4');
        const embeddedDigest = Buffer.from(msgDigestAttr.values[0].valueBlock.valueHexView).toString('hex');
        const realDigest     = crypto.createHash('sha256').update(f1.signedBytes).digest('hex');
        expect(embeddedDigest).toBe(realDigest);

        const verifyAttrsBuf = Buffer.from(f1.si.signedAttrs.toSchema().toBER(false));
        verifyAttrsBuf[0]    = 0x31;
        const sigBytes = Buffer.from(f1.si.signature.valueBlock.valueHexView);
        expect(crypto.verify('RSA-SHA256', verifyAttrsBuf, certPemDir1, sigBytes)).toBe(true);
      });

      test('Firma 2 (Subdecano) permanece 100% válida tras la tercera firma', () => {
        const firmas = extraerFirmasDelPdf(pdfFirmado3);
        const f2 = firmas[1];
        expect(f2.subFilter).toBe('ETSI.CAdES.detached');

        const msgDigestAttr = f2.si.signedAttrs.attributes.find(a => a.type === '1.2.840.113549.1.9.4');
        const embeddedDigest = Buffer.from(msgDigestAttr.values[0].valueBlock.valueHexView).toString('hex');
        const realDigest     = crypto.createHash('sha256').update(f2.signedBytes).digest('hex');
        expect(embeddedDigest).toBe(realDigest);

        const verifyAttrsBuf = Buffer.from(f2.si.signedAttrs.toSchema().toBER(false));
        verifyAttrsBuf[0]    = 0x31;
        const sigBytes = Buffer.from(f2.si.signature.valueBlock.valueHexView);
        expect(crypto.verify('RSA-SHA256', verifyAttrsBuf, certPemDir2, sigBytes)).toBe(true);
      });
    });

    describe('Firma 3 (Decano)', () => {
      test('Bug 1 — /SubFilter es ETSI.CAdES.detached', () => {
        const firmas = extraerFirmasDelPdf(pdfFirmado3);
        expect(firmas[2].subFilter).toBe('ETSI.CAdES.detached');
      });

      test('Bug 2 — contiene el atributo signingCertificateV2', () => {
        const firmas = extraerFirmasDelPdf(pdfFirmado3);
        const hasEss = firmas[2].si.signedAttrs.attributes.some(
          a => a.type === '1.2.840.113549.1.9.16.2.47'
        );
        expect(hasEss).toBe(true);
      });

      test('messageDigest coincide con SHA-256 del tercer ByteRange', () => {
        const firmas = extraerFirmasDelPdf(pdfFirmado3);
        const f3 = firmas[2];
        const msgDigestAttr = f3.si.signedAttrs.attributes.find(a => a.type === '1.2.840.113549.1.9.4');
        const embeddedDigest = Buffer.from(msgDigestAttr.values[0].valueBlock.valueHexView).toString('hex');
        const realDigest     = crypto.createHash('sha256').update(f3.signedBytes).digest('hex');
        expect(embeddedDigest).toBe(realDigest);
      });

      test('firma RSA de etapa 3 verifica con clave pública del Decano', () => {
        const firmas = extraerFirmasDelPdf(pdfFirmado3);
        const f3 = firmas[2];
        const verifyAttrsBuf = Buffer.from(f3.si.signedAttrs.toSchema().toBER(false));
        verifyAttrsBuf[0]    = 0x31;
        const sigBytes = Buffer.from(f3.si.signature.valueBlock.valueHexView);
        expect(crypto.verify('RSA-SHA256', verifyAttrsBuf, certPemDir3, sigBytes)).toBe(true);
      });
    });
  });

  // ── Etapa 4: cuarto firmante (Rector) sobre PDF_FIRMADO3 ─────────────────
  describe('Etapa 4 — Rector (sobre PDF firmado por Director, Subdecano y Decano)', () => {
    let pdfFirmado4;

    beforeAll(async () => {
      const resultado = await firmaService.firmarDocumento({
        rutaPdf:      PDF_FIRMADO3,
        rutaCertP12:  P12_DIR4,
        passwordCert: passDir4,
        firmante:     { nombre: 'Rector Test', rol: 'RECTOR' },
      });
      pdfFirmado4 = resultado.pdfFirmado;
      fs.writeFileSync(PDF_FIRMADO4, pdfFirmado4);
    });

    test('devuelve un Buffer no vacío', () => {
      expect(Buffer.isBuffer(pdfFirmado4)).toBe(true);
      expect(pdfFirmado4.length).toBeGreaterThan(100);
    });

    test('el PDF final contiene exactamente 4 firmas independientes', () => {
      const firmas = extraerFirmasDelPdf(pdfFirmado4);
      expect(firmas).toHaveLength(4);
    });

    describe('Integridad Criptográfica de las 4 Firmas en el PDF Final', () => {
      test('Firma 1 (Director) permanece 100% válida tras completar las 4 firmas', () => {
        const firmas = extraerFirmasDelPdf(pdfFirmado4);
        const f = firmas[0];
        expect(f.subFilter).toBe('ETSI.CAdES.detached');

        const msgDigestAttr = f.si.signedAttrs.attributes.find(a => a.type === '1.2.840.113549.1.9.4');
        const embeddedDigest = Buffer.from(msgDigestAttr.values[0].valueBlock.valueHexView).toString('hex');
        const realDigest     = crypto.createHash('sha256').update(f.signedBytes).digest('hex');
        expect(embeddedDigest).toBe(realDigest);

        const verifyAttrsBuf = Buffer.from(f.si.signedAttrs.toSchema().toBER(false));
        verifyAttrsBuf[0]    = 0x31;
        const sigBytes = Buffer.from(f.si.signature.valueBlock.valueHexView);
        expect(crypto.verify('RSA-SHA256', verifyAttrsBuf, certPemDir1, sigBytes)).toBe(true);
      });

      test('Firma 2 (Subdecano) permanece 100% válida tras completar las 4 firmas', () => {
        const firmas = extraerFirmasDelPdf(pdfFirmado4);
        const f = firmas[1];
        expect(f.subFilter).toBe('ETSI.CAdES.detached');

        const msgDigestAttr = f.si.signedAttrs.attributes.find(a => a.type === '1.2.840.113549.1.9.4');
        const embeddedDigest = Buffer.from(msgDigestAttr.values[0].valueBlock.valueHexView).toString('hex');
        const realDigest     = crypto.createHash('sha256').update(f.signedBytes).digest('hex');
        expect(embeddedDigest).toBe(realDigest);

        const verifyAttrsBuf = Buffer.from(f.si.signedAttrs.toSchema().toBER(false));
        verifyAttrsBuf[0]    = 0x31;
        const sigBytes = Buffer.from(f.si.signature.valueBlock.valueHexView);
        expect(crypto.verify('RSA-SHA256', verifyAttrsBuf, certPemDir2, sigBytes)).toBe(true);
      });

      test('Firma 3 (Decano) permanece 100% válida tras completar las 4 firmas', () => {
        const firmas = extraerFirmasDelPdf(pdfFirmado4);
        const f = firmas[2];
        expect(f.subFilter).toBe('ETSI.CAdES.detached');

        const msgDigestAttr = f.si.signedAttrs.attributes.find(a => a.type === '1.2.840.113549.1.9.4');
        const embeddedDigest = Buffer.from(msgDigestAttr.values[0].valueBlock.valueHexView).toString('hex');
        const realDigest     = crypto.createHash('sha256').update(f.signedBytes).digest('hex');
        expect(embeddedDigest).toBe(realDigest);

        const verifyAttrsBuf = Buffer.from(f.si.signedAttrs.toSchema().toBER(false));
        verifyAttrsBuf[0]    = 0x31;
        const sigBytes = Buffer.from(f.si.signature.valueBlock.valueHexView);
        expect(crypto.verify('RSA-SHA256', verifyAttrsBuf, certPemDir3, sigBytes)).toBe(true);
      });

      test('Firma 4 (Rector) es 100% válida y completa el ciclo', () => {
        const firmas = extraerFirmasDelPdf(pdfFirmado4);
        const f = firmas[3];
        expect(f.subFilter).toBe('ETSI.CAdES.detached');

        const hasEss = f.si.signedAttrs.attributes.some(a => a.type === '1.2.840.113549.1.9.16.2.47');
        expect(hasEss).toBe(true);

        const msgDigestAttr = f.si.signedAttrs.attributes.find(a => a.type === '1.2.840.113549.1.9.4');
        const embeddedDigest = Buffer.from(msgDigestAttr.values[0].valueBlock.valueHexView).toString('hex');
        const realDigest     = crypto.createHash('sha256').update(f.signedBytes).digest('hex');
        expect(embeddedDigest).toBe(realDigest);

        const verifyAttrsBuf = Buffer.from(f.si.signedAttrs.toSchema().toBER(false));
        verifyAttrsBuf[0]    = 0x31;
        const sigBytes = Buffer.from(f.si.signature.valueBlock.valueHexView);
        expect(crypto.verify('RSA-SHA256', verifyAttrsBuf, certPemDir4, sigBytes)).toBe(true);
      });
    });
  });
});

