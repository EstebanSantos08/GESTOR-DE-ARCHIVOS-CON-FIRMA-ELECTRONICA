const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');

// Mocks definidos antes de jest.mock
const mockDocumento = {
  create: jest.fn(),
  findAll: jest.fn(),
  findByPk: jest.fn(),
  update: jest.fn(),
};

const mockUsuario = {
  findOne: jest.fn(),
  findByPk: jest.fn(),
};

jest.mock('../../Services/auth.service', () => ({
  verificarToken: jest.fn(),
}));

jest.mock('../../Services/firma.service', () => ({
  calcularHash: jest.fn().mockReturnValue('a'.repeat(64)),
  firmarDocumento: jest.fn(),
}));

jest.mock('../../Services/workflow.service', () => ({
  asignarFirmanteInicial: jest.fn().mockResolvedValue({ id: 2 }),
  procesarFirma: jest.fn(),
  rechazar: jest.fn(),
}));

jest.mock('../../Model', () => ({
  Documento: mockDocumento,
  Usuario: mockUsuario,
  Rol: {},
  Facultad: {},
  Actividad: {},
}));

const authService = require('../../Services/auth.service');
const firmaService = require('../../Services/firma.service');
const workflowService = require('../../Services/workflow.service');
const documentoRoutes = require('../../Routes/documento.routes');

// Crear app de prueba
function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api/documentos', documentoRoutes);
  app.use((err, req, res, next) => {
    if (err.name === 'MulterError' || err.message?.includes('Solo se permiten')) {
      return res.status(400).json({ error: `Error de archivo: ${err.message}` });
    }
    res.status(500).json({ error: err.message });
  });
  return app;
}

const app = createApp();

describe('Documento Routes - Integration', () => {
  const tokenDocente = 'token_docente';
  const tokenDecano = 'token_decano';

  beforeEach(() => {
    jest.clearAllMocks();
    authService.verificarToken.mockReturnValue({
      id: 1, email: 'docente@test.com', rol: 'DOCENTE', nivel: 1,
    });
  });

  // ─── POST /api/documentos/subir ────────────────────────────────────────
  describe('POST /api/documentos/subir', () => {
    const uploadsDir = './test-uploads';

    beforeAll(() => {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
    });

    afterAll(() => {
      if (fs.existsSync(uploadsDir)) {
        fs.rmSync(uploadsDir, { recursive: true, force: true });
      }
    });

    it('debe subir un documento PDF exitosamente', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 test content for upload');
      mockDocumento.create.mockResolvedValue({
        id: 1,
        nombre_original: 'test.pdf',
        ruta_archivo: `${uploadsDir}/test.pdf`,
        estado: 'PENDIENTE',
        subido_por_id: 1,
        hash_sha256: 'a'.repeat(64),
        reload: jest.fn().mockResolvedValue({
          id: 1, nombre_original: 'test.pdf', estado: 'PENDIENTE', subido_por_id: 1,
        }),
      });

      const res = await request(app)
        .post('/api/documentos/subir')
        .set('Authorization', `Bearer ${tokenDocente}`)
        .attach('archivo', pdfBuffer, 'test.pdf');

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id', 1);
      expect(mockDocumento.create).toHaveBeenCalled();
    });

    it('debe retornar 400 si no se envía archivo', async () => {
      const res = await request(app)
        .post('/api/documentos/subir')
        .set('Authorization', `Bearer ${tokenDocente}`);

      expect(res.status).toBe(400);
    });

    it('debe retornar 401 sin autenticación', async () => {
      const res = await request(app).post('/api/documentos/subir');
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/documentos ────────────────────────────────────────────────
  describe('GET /api/documentos', () => {
    it('debe listar documentos (DOCENTE ve los suyos)', async () => {
      mockDocumento.findAll.mockResolvedValue([
        { id: 1, nombre_original: 'doc1.pdf', estado: 'PENDIENTE' },
      ]);

      const res = await request(app)
        .get('/api/documentos')
        .set('Authorization', `Bearer ${tokenDocente}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(mockDocumento.findAll).toHaveBeenCalled();
    });

    it('debe listar documentos (DECANO ve los asignados)', async () => {
      authService.verificarToken.mockReturnValue({
        id: 2, email: 'decano@test.com', roles: ['DECANO'], nivel: 2,
      });
      mockDocumento.findAll.mockResolvedValue([
        { id: 2, nombre_original: 'doc2.pdf', estado: 'PENDIENTE' },
      ]);

      const res = await request(app)
        .get('/api/documentos')
        .set('Authorization', `Bearer ${tokenDecano}`);

      expect(res.status).toBe(200);
      expect(mockDocumento.findAll).toHaveBeenCalled();
    });

    it('debe filtrar por estado', async () => {
      mockDocumento.findAll.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/documentos?estado=PENDIENTE')
        .set('Authorization', `Bearer ${tokenDocente}`);

      expect(res.status).toBe(200);
      expect(mockDocumento.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ estado: 'PENDIENTE' }),
        })
      );
    });

    it('debe retornar 401 sin autenticación', async () => {
      const res = await request(app).get('/api/documentos');
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/documentos/:id ────────────────────────────────────────────
  describe('GET /api/documentos/:id', () => {
    it('debe obtener un documento por ID', async () => {
      mockDocumento.findByPk.mockResolvedValue({
        id: 1, nombre_original: 'test.pdf', estado: 'PENDIENTE',
      });

      const res = await request(app)
        .get('/api/documentos/1')
        .set('Authorization', `Bearer ${tokenDocente}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 1);
    });

    it('debe retornar 404 si el documento no existe', async () => {
      mockDocumento.findByPk.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/documentos/999')
        .set('Authorization', `Bearer ${tokenDocente}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── POST /api/documentos/:id/firmar ────────────────────────────────────
  describe('POST /api/documentos/:id/firmar', () => {
    const fakeCertBase64 = Buffer.from('fake-p12-content').toString('base64');

    beforeEach(() => {
      authService.verificarToken.mockReturnValue({
        id: 2, email: 'decano@test.com', roles: ['DECANO'], nivel: 2,
      });
      mockUsuario.findByPk.mockResolvedValue({
        id: 2, nombre: 'Decano Test', roles: [{ nombre: 'DECANO' }],
      });
      mockDocumento.findByPk.mockResolvedValue({
        id: 1,
        ruta_archivo: 'uploads/test.pdf',
        estado: 'PENDIENTE',
        firmante_actual_id: 2,
        update: jest.fn().mockResolvedValue(true),
      });
    });

    it('debe permitir firma de DECANO', async () => {
      firmaService.firmarDocumento.mockResolvedValue({
        pdfFirmado: Buffer.from('signed-pdf-content'),
        hashSha256: 'b'.repeat(64),
      });

      workflowService.procesarFirma.mockResolvedValue({
        id: 1, estado: 'FIRMADO_DECANO',
      });

      const res = await request(app)
        .post('/api/documentos/1/firmar')
        .set('Authorization', `Bearer ${tokenDecano}`)
        .send({ observaciones: 'Firmado', certBase64: fakeCertBase64, certPassword: 'test123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('mensaje', 'Documento firmado correctamente');
    });

    it('debe denegar firma si el usuario no es el firmante asignado', async () => {
      authService.verificarToken.mockReturnValue({
        id: 99, email: 'otro@test.com', roles: ['DOCENTE'], nivel: 1,
      });
      mockUsuario.findByPk.mockResolvedValue({
        id: 99, nombre: 'Otro', roles: [{ nombre: 'DOCENTE' }],
      });

      firmaService.firmarDocumento.mockResolvedValue({
        pdfFirmado: Buffer.from('signed-pdf-content'),
        hashSha256: 'b'.repeat(64),
      });

      workflowService.procesarFirma.mockRejectedValue(
        new Error('No tiene autorización para firmar este documento en esta etapa')
      );

      const res = await request(app)
        .post('/api/documentos/1/firmar')
        .set('Authorization', `Bearer ${tokenDocente}`)
        .send({ certBase64: fakeCertBase64, certPassword: '123' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'No tiene autorización para firmar este documento en esta etapa');
    });

    it('debe retornar 404 si documento no existe', async () => {
      mockDocumento.findByPk.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/documentos/999/firmar')
        .set('Authorization', `Bearer ${tokenDecano}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── POST /api/documentos/:id/rechazar ──────────────────────────────────
  describe('POST /api/documentos/:id/rechazar', () => {
    beforeEach(() => {
      authService.verificarToken.mockReturnValue({
        id: 2, email: 'decano@test.com', roles: ['DECANO'], nivel: 2,
      });
    });

    it('debe rechazar un documento exitosamente', async () => {
      workflowService.rechazar.mockResolvedValue({
        id: 1, estado: 'RECHAZADO', observaciones: 'Documento incompleto',
      });

      const res = await request(app)
        .post('/api/documentos/1/rechazar')
        .set('Authorization', `Bearer ${tokenDecano}`)
        .send({ motivo: 'Documento incompleto' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('mensaje', 'Documento rechazado');
    });

    it('debe retornar 400 si no se proporciona motivo', async () => {
      const res = await request(app)
        .post('/api/documentos/1/rechazar')
        .set('Authorization', `Bearer ${tokenDecano}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'El motivo de rechazo es obligatorio');
    });

    it('debe denegar rechazo si no es el firmante asignado', async () => {
      authService.verificarToken.mockReturnValue({
        id: 99, email: 'docente@test.com', roles: ['DOCENTE'], nivel: 1,
      });

      workflowService.rechazar.mockRejectedValue(
        new Error('No tiene autorización para rechazar este documento')
      );

      const res = await request(app)
        .post('/api/documentos/1/rechazar')
        .set('Authorization', `Bearer ${tokenDocente}`)
        .send({ motivo: 'Motivo' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'No tiene autorización para rechazar este documento');
    });
  });

  // ─── GET /api/documentos/:id/descargar ──────────────────────────────────
  describe('GET /api/documentos/:id/descargar', () => {
    it('debe descargar un documento existente', async () => {
      const pdfContent = Buffer.from('%PDF-1.4 test content');
      const tempPath = path.join(__dirname, '../../test-temp-download.pdf');
      fs.writeFileSync(tempPath, pdfContent);

      mockDocumento.findByPk.mockResolvedValue({
        id: 1, nombre_original: 'documento.pdf', ruta_archivo: tempPath,
      });

      const res = await request(app)
        .get('/api/documentos/1/descargar')
        .set('Authorization', `Bearer ${tokenDocente}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');

      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    });

    it('debe retornar 404 si el documento no existe', async () => {
      mockDocumento.findByPk.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/documentos/999/descargar')
        .set('Authorization', `Bearer ${tokenDocente}`);

      expect(res.status).toBe(404);
    });

    it('debe retornar 404 si el archivo no existe en disco', async () => {
      mockDocumento.findByPk.mockResolvedValue({
        id: 1, nombre_original: 'no-existe.pdf', ruta_archivo: '/ruta/inexistente.pdf',
      });

      const res = await request(app)
        .get('/api/documentos/1/descargar')
        .set('Authorization', `Bearer ${tokenDocente}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Archivo no encontrado en el servidor');
    });
  });
});
