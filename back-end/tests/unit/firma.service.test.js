const fs = require('fs');
const crypto = require('crypto');
const forge = require('node-forge');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const firmaService = require('../../Services/firma.service');

describe('FirmaService', () => {
  describe('calcularHash', () => {
    it('debe calcular el hash SHA-256 correctamente', () => {
      const buffer = Buffer.from('contenido de prueba');
      const hashEsperado = crypto.createHash('sha256').update(buffer).digest('hex');

      const resultado = firmaService.calcularHash(buffer);

      expect(resultado).toBe(hashEsperado);
      expect(resultado).toHaveLength(64); // SHA-256 en hex = 64 chars
    });

    it('debe producir el mismo hash para el mismo contenido', () => {
      const buffer = Buffer.from('test data');
      const hash1 = firmaService.calcularHash(buffer);
      const hash2 = firmaService.calcularHash(buffer);

      expect(hash1).toBe(hash2);
    });

    it('debe producir hash diferente para contenido diferente', () => {
      const hash1 = firmaService.calcularHash(Buffer.from('datos'));
      const hash2 = firmaService.calcularHash(Buffer.from('otros datos'));

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('cargarCertificado', () => {
    it('debe lanzar error si el archivo .p12 no existe', () => {
      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      expect(() => firmaService.cargarCertificado('/no/existe.p12', 'pass')).toThrow();
    });
  });

  describe('agregarSelloVisual', () => {
    it('debe agregar un sello visual a un PDF y devolver el buffer resultante', async () => {
      // Crear un PDF simple en memoria para probar
      const pdfDoc = await PDFDocument.create();
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const page = pdfDoc.addPage();
      page.setFont(timesRomanFont);
      page.drawText('Documento de prueba', { x: 50, y: 500, size: 12 });
      const pdfBuffer = Buffer.from(await pdfDoc.save());

      const firmante = { nombre: 'Dr. Juan Pérez', rol: 'DECANO' };
      const fechaFirma = new Date('2025-01-15T10:00:00Z');

      const resultado = await firmaService.agregarSelloVisual(pdfBuffer, firmante, fechaFirma);

      expect(resultado).toBeInstanceOf(Buffer);
      expect(resultado.length).toBeGreaterThan(pdfBuffer.length);

      // Verificar que el PDF resultante sigue siendo válido
      const pdfCargado = await PDFDocument.load(resultado);
      expect(pdfCargado.getPageCount()).toBe(1);
    });

    it('debe mantener las páginas originales del PDF', async () => {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      pdfDoc.addPage();
      pdfDoc.addPage();
      const pdfBuffer = Buffer.from(await pdfDoc.save());

      const resultado = await firmaService.agregarSelloVisual(
        pdfBuffer,
        { nombre: 'Test', rol: 'RECTOR' },
        new Date()
      );

      const pdfCargado = await PDFDocument.load(resultado);
      expect(pdfCargado.getPageCount()).toBe(2);
    });
  });

  describe('construirFirmaPKCS7', () => {
    it('debe lanzar error si el certificado no es válido', () => {
      expect(() =>
        firmaService.construirFirmaPKCS7(
          Buffer.from('test'),
          { invalidKey: true },
          { invalidCert: true }
        )
      ).toThrow();
    });
  });

  describe('firmarDocumento', () => {
    const rutaPdf = '/tmp/test-doc.pdf';
    const rutaCert = '/tmp/test-cert.p12';
    const passCert = 'testpass';
    const firmante = { nombre: 'Dr. Test', rol: 'DECANO' };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('debe lanzar error si no se puede cargar el certificado', async () => {
      jest.spyOn(fs, 'readFileSync').mockImplementation((path) => {
        if (path === rutaPdf) return Buffer.from('%PDF-1.4 test content');
        throw new Error('Certificado no encontrado');
      });

      await expect(
        firmaService.firmarDocumento({ rutaPdf, rutaCertP12: rutaCert, passwordCert: passCert, firmante })
      ).rejects.toThrow();
    });

    it('debe lanzar error si el PDF no existe', async () => {
      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('ENOENT: archivo no encontrado');
      });

      await expect(
        firmaService.firmarDocumento({ rutaPdf, rutaCertP12: rutaCert, passwordCert: passCert, firmante })
      ).rejects.toThrow();
    });
  });
});
