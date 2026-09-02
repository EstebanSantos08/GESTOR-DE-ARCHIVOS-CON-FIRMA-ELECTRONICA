const fs = require('fs');
const path = require('path');
const forge = require('node-forge');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const firmaService = require('./Services/firma.service');

function generarCertificadoP12(cn, email, cargo) {
  const keypair = forge.pki.rsa.generateKeyPair(2048);
  const cert    = forge.pki.createCertificate();
  cert.publicKey = keypair.publicKey;
  cert.serialNumber = String(Date.now());
  cert.validity.notBefore = new Date();
  cert.validity.notAfter  = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 2);

  const attrs = [
    { name: 'commonName', value: cn },
    { name: 'emailAddress', value: email },
    { name: 'organizationName', value: 'Universidad Católica de Cuenca' },
    { name: 'organizationalUnitName', value: cargo }
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keypair.privateKey, forge.md.sha256.create());

  const password = 'Password123!';
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
    cn,
  };
}

async function main() {
  console.log('=== Generando PDF con las 4 Firmas PAdES-BES ===\n');

  const UPLOADS_DIR = path.join(__dirname, 'uploads');
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  // 1. Crear documento PDF formal
  console.log('1. Creando documento PDF base...');
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Encabezado
  page.drawRectangle({
    x: 18, y: 842 - 70, width: 595 - 36, height: 50,
    color: rgb(0.06, 0.13, 0.37)
  });
  page.drawText('UNIVERSIDAD DE CUENCA', {
    x: 35, y: 842 - 45, size: 14, font: fontBold, color: rgb(1, 1, 1)
  });
  page.drawText('SISTEMA DE GESTIÓN DOCUMENTAL Y ACREDITACIÓN INSTITUCIONAL', {
    x: 35, y: 842 - 60, size: 8, font: fontNormal, color: rgb(0.85, 0.9, 1)
  });

  // Título
  page.drawText('INFORME TÉCNICO DE EVALUACIÓN DE CRITERIOS Y EVIDENCIAS', {
    x: 35, y: 842 - 105, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1)
  });
  page.drawText('Período Académico: 2026-2026 | Carrera: Ingeniería de Software | Indicador: 14 (Gestión Curricular)', {
    x: 35, y: 842 - 120, size: 8, font: fontNormal, color: rgb(0.3, 0.3, 0.3)
  });

  // Cuerpo del informe
  const cuerpoTexto = [
    'El presente documento certifica la revisión, validación técnica y aprobación del expediente',
    'de acreditación correspondiente a las evidencias y actividades institucionales cargadas en',
    'el repositorio documental.',
    '',
    'Conforme al reglamento de aseguramiento de la calidad y acreditación universitaria, se remite',
    'para la respectiva suscripción digital y fe pública por parte de las autoridades competentes:',
    '',
    '  1. Dirección de Carrera (Revisión técnica inicial de evidencias)',
    '  2. Subdecanato de Facultad (Validación académica y curricular)',
    '  3. Decanato de Facultad (Aprobación de la unidad académica)',
    '  4. Rectorado (Aprobación institucional y cierre del expediente)',
    '',
    'Este documento cuenta con firma electrónica avanzada conforme a la norma ISO 32000-1 y al',
    'perfil PAdES-BES (ETSI EN 319 142), garantizando autenticidad, integridad y no repudio.',
  ];

  let posY = 842 - 150;
  for (const linea of cuerpoTexto) {
    page.drawText(linea, { x: 35, y: posY, size: 8.5, font: fontNormal, color: rgb(0.2, 0.2, 0.2) });
    posY -= 14;
  }

  const pdfBaseBytes = await pdfDoc.save({ useObjectStreams: false });

  // 2. Generar 4 certificados institucionales
  console.log('2. Generando certificados .p12 para los 4 firmantes...');
  const c1 = generarCertificadoP12('Ing. Carlos Mendoza, M.Sc.', 'carlos.mendoza@ucacue.edu.ec', 'Director de Carrera');
  const c2 = generarCertificadoP12('Dra. Elena Ramos, Ph.D.', 'elena.ramos@ucacue.edu.ec', 'Subdecana de Facultad');
  const c3 = generarCertificadoP12('Dr. Fernando Torres, Ph.D.', 'fernando.torres@ucacue.edu.ec', 'Decano de Facultad');
  const c4 = generarCertificadoP12('Dr. Santiago Cárdenas, Ph.D.', 'santiago.cardenas@ucacue.edu.ec', 'Rector');

  const p12Path1 = path.join(UPLOADS_DIR, 'cert_director.p12');
  const p12Path2 = path.join(UPLOADS_DIR, 'cert_subdecano.p12');
  const p12Path3 = path.join(UPLOADS_DIR, 'cert_decano.p12');
  const p12Path4 = path.join(UPLOADS_DIR, 'cert_rector.p12');

  fs.writeFileSync(p12Path1, c1.p12Buffer);
  fs.writeFileSync(p12Path2, c2.p12Buffer);
  fs.writeFileSync(p12Path3, c3.p12Buffer);
  fs.writeFileSync(p12Path4, c4.p12Buffer);

  // 3. Pre-estampar los 4 sellos visuales en el PDF base
  console.log('3. Pre-estampando los 4 sellos visuales con QR en el PDF...');
  const firmantesArray = [
    { nombre: c1.cn, rol: 'DIRECTOR_CARRERA' },
    { nombre: c2.cn, rol: 'SUBDECANO' },
    { nombre: c3.cn, rol: 'DECANO' },
    { nombre: c4.cn, rol: 'RECTOR' },
  ];
  const pdfPreparado = await firmaService.prepararDocumento(Buffer.from(pdfBaseBytes), firmantesArray);
  const pdfPrepPath = path.join(UPLOADS_DIR, 'documento_base_preparado.pdf');
  fs.writeFileSync(pdfPrepPath, pdfPreparado);

  // 4. Etapa 1: Firma Director de Carrera
  console.log('4. Aplicando Firma 1/4: Director de Carrera...');
  const res1 = await firmaService.firmarDocumento({
    rutaPdf: pdfPrepPath,
    rutaCertP12: p12Path1,
    passwordCert: c1.password,
    firmante: { nombre: c1.cn, rol: 'DIRECTOR_CARRERA' },
  });
  const pdfF1Path = path.join(UPLOADS_DIR, 'documento_firmado_etapa1.pdf');
  fs.writeFileSync(pdfF1Path, res1.pdfFirmado);

  // 5. Etapa 2: Firma Subdecano
  console.log('5. Aplicando Firma 2/4: Subdecano...');
  const res2 = await firmaService.firmarDocumento({
    rutaPdf: pdfF1Path,
    rutaCertP12: p12Path2,
    passwordCert: c2.password,
    firmante: { nombre: c2.cn, rol: 'SUBDECANO' },
  });
  const pdfF2Path = path.join(UPLOADS_DIR, 'documento_firmado_etapa2.pdf');
  fs.writeFileSync(pdfF2Path, res2.pdfFirmado);

  // 6. Etapa 3: Firma Decano
  console.log('6. Aplicando Firma 3/4: Decano...');
  const res3 = await firmaService.firmarDocumento({
    rutaPdf: pdfF2Path,
    rutaCertP12: p12Path3,
    passwordCert: c3.password,
    firmante: { nombre: c3.cn, rol: 'DECANO' },
  });
  const pdfF3Path = path.join(UPLOADS_DIR, 'documento_firmado_etapa3.pdf');
  fs.writeFileSync(pdfF3Path, res3.pdfFirmado);

  // 7. Etapa 4: Firma Rector (Final)
  console.log('7. Aplicando Firma 4/4: Rector (Documento Completado)...');
  const res4 = await firmaService.firmarDocumento({
    rutaPdf: pdfF3Path,
    rutaCertP12: p12Path4,
    passwordCert: c4.password,
    firmante: { nombre: c4.cn, rol: 'RECTOR' },
  });
  const finalPdfPath = path.join(UPLOADS_DIR, 'documento_4_firmas_completo.pdf');
  fs.writeFileSync(finalPdfPath, res4.pdfFirmado);

  console.log('\n[ÉXITO] Documento generado correctamente:');
  console.log('  Ruta: ' + finalPdfPath);
  console.log('  Tamaño: ' + (res4.pdfFirmado.length / 1024).toFixed(2) + ' KB');
  console.log('  Firmas incluidas: 4 firmas PAdES-BES (Director, Subdecano, Decano, Rector)');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
