const request = require('supertest');
const express = require('express');

// Mocks definidos antes de jest.mock para evitar hoisting issues
const mockUniversidad = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
};
const mockFacultad = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
};
const mockCriterio = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
};
const mockActividad = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
};

jest.mock('../../Services/auth.service', () => ({
  verificarToken: jest.fn(),
}));

jest.mock('../../Model', () => ({
  Universidad: mockUniversidad,
  Facultad: mockFacultad,
  Criterio: mockCriterio,
  Actividad: mockActividad,
}));

const authService = require('../../Services/auth.service');
const parametrizacionRoutes = require('../../Routes/parametrizacion.routes');

// Crear app de prueba
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/parametrizacion', parametrizacionRoutes);
  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
  });
  return app;
}

const app = createApp();

describe('Parametrizacion Routes - Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Helpers para configurar autenticación ───────────────────────────────
  const autenticarComo = (rol, nivel) => {
    const roles = {
      DOCENTE: { id: 1, rol: 'DOCENTE', nivel: 1 },
      DECANO: { id: 2, rol: 'DECANO', nivel: 2 },
      RECTOR: { id: 3, rol: 'RECTOR', nivel: 3 },
    };
    authService.verificarToken.mockReturnValue({
      id: roles[rol].id,
      email: `${rol.toLowerCase()}@test.com`,
      rol,
      nivel,
    });
  };

  // ─── ENDPOINTS DE LECTURA (acceso cualquier rol autenticado) ───────────
  describe('GET endpoints (acceso cualquier rol autenticado)', () => {
    beforeEach(() => autenticarComo('DOCENTE', 1));

    it('GET /universidades - debe listar universidades activas', async () => {
      mockUniversidad.findAll.mockResolvedValue([
        { id: 1, nombre: 'Universidad Test', activo: true },
      ]);

      const res = await request(app)
        .get('/api/parametrizacion/universidades')
        .set('Authorization', 'Bearer test');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(mockUniversidad.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { activo: true } })
      );
    });

    it('GET /facultades - debe listar facultades activas', async () => {
      mockFacultad.findAll.mockResolvedValue([
        { id: 1, nombre: 'Facultad Test', activo: true },
      ]);

      const res = await request(app)
        .get('/api/parametrizacion/facultades')
        .set('Authorization', 'Bearer test');

      expect(res.status).toBe(200);
    });

    it('GET /criterios - debe listar criterios activos', async () => {
      mockCriterio.findAll.mockResolvedValue([
        { id: 1, nombre: 'Criterio Test', activo: true },
      ]);

      const res = await request(app)
        .get('/api/parametrizacion/criterios')
        .set('Authorization', 'Bearer test');

      expect(res.status).toBe(200);
    });

    it('GET /actividades - debe listar actividades activas', async () => {
      mockActividad.findAll.mockResolvedValue([
        { id: 1, nombre: 'Actividad Test', activo: true },
      ]);

      const res = await request(app)
        .get('/api/parametrizacion/actividades')
        .set('Authorization', 'Bearer test');

      expect(res.status).toBe(200);
    });

    it('GET /universidades/:id - debe obtener una universidad por ID', async () => {
      mockUniversidad.findOne.mockResolvedValue({
        id: 1, nombre: 'Universidad Test', activo: true,
      });

      const res = await request(app)
        .get('/api/parametrizacion/universidades/1')
        .set('Authorization', 'Bearer test');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 1);
    });

    it('GET /universidades/:id - debe retornar 404 si no existe', async () => {
      mockUniversidad.findOne.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/parametrizacion/universidades/999')
        .set('Authorization', 'Bearer test');

      expect(res.status).toBe(404);
    });
  });

  // ─── ENDPOINTS DE ESCRITURA (solo DECANO/RECTOR - nivel >= 2) ─────────
  describe('POST/PUT/DELETE endpoints (solo nivel >= 2)', () => {
    describe('POST - crear registros', () => {
      it('POST /universidades - debe crear como DECANO', async () => {
        autenticarComo('DECANO', 2);
        mockUniversidad.create.mockResolvedValue({
          id: 2, nombre: 'Nueva Universidad', activo: true,
        });

        const res = await request(app)
          .post('/api/parametrizacion/universidades')
          .set('Authorization', 'Bearer decano')
          .send({ nombre: 'Nueva Universidad' });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('nombre', 'Nueva Universidad');
      });

      it('POST /universidades - debe retornar 403 como DOCENTE', async () => {
        autenticarComo('DOCENTE', 1);

        const res = await request(app)
          .post('/api/parametrizacion/universidades')
          .set('Authorization', 'Bearer docente')
          .send({ nombre: 'Nueva Universidad' });

        expect(res.status).toBe(403);
      });

      it('POST /universidades - debe retornar 400 si falta nombre', async () => {
        autenticarComo('RECTOR', 3);

        const res = await request(app)
          .post('/api/parametrizacion/universidades')
          .set('Authorization', 'Bearer rector')
          .send({});

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('errores');
      });

      it('POST /facultades - debe crear facultad con universidad_id', async () => {
        autenticarComo('DECANO', 2);
        mockFacultad.create.mockResolvedValue({
          id: 1, nombre: 'Facultad de Derecho', universidad_id: 1,
        });

        const res = await request(app)
          .post('/api/parametrizacion/facultades')
          .set('Authorization', 'Bearer decano')
          .send({ nombre: 'Facultad de Derecho', universidad_id: 1 });

        expect(res.status).toBe(201);
      });

      it('POST /facultades - debe retornar 400 si falta universidad_id', async () => {
        autenticarComo('DECANO', 2);

        const res = await request(app)
          .post('/api/parametrizacion/facultades')
          .set('Authorization', 'Bearer decano')
          .send({ nombre: 'Facultad' });

        expect(res.status).toBe(400);
      });

      it('POST /criterios - debe crear criterio', async () => {
        autenticarComo('RECTOR', 3);
        mockCriterio.create.mockResolvedValue({ id: 1, nombre: 'Criterio A' });

        const res = await request(app)
          .post('/api/parametrizacion/criterios')
          .set('Authorization', 'Bearer rector')
          .send({ nombre: 'Criterio A' });

        expect(res.status).toBe(201);
      });

      it('POST /actividades - debe crear actividad con criterio_id', async () => {
        autenticarComo('DECANO', 2);
        mockActividad.create.mockResolvedValue({
          id: 1, nombre: 'Actividad 1', criterio_id: 1,
        });

        const res = await request(app)
          .post('/api/parametrizacion/actividades')
          .set('Authorization', 'Bearer decano')
          .send({ nombre: 'Actividad 1', criterio_id: 1 });

        expect(res.status).toBe(201);
      });

      it('POST /actividades - debe retornar 400 si falta criterio_id', async () => {
        autenticarComo('DECANO', 2);

        const res = await request(app)
          .post('/api/parametrizacion/actividades')
          .set('Authorization', 'Bearer decano')
          .send({ nombre: 'Actividad' });

        expect(res.status).toBe(400);
      });
    });

    // ─── Actualizar ─────────────────────────────────────────────────────
    describe('PUT - actualizar registros', () => {
      it('PUT /universidades/:id - debe actualizar como DECANO', async () => {
        autenticarComo('DECANO', 2);
        const registro = {
          id: 1, nombre: 'Original', activo: true,
          update: jest.fn().mockResolvedValue(true),
        };
        mockUniversidad.findOne.mockResolvedValue(registro);

        const res = await request(app)
          .put('/api/parametrizacion/universidades/1')
          .set('Authorization', 'Bearer decano')
          .send({ nombre: 'Actualizada' });

        expect(res.status).toBe(200);
      });

      it('PUT /universidades/:id - retornar 404 si no existe', async () => {
        autenticarComo('DECANO', 2);
        mockUniversidad.findOne.mockResolvedValue(null);

        const res = await request(app)
          .put('/api/parametrizacion/universidades/999')
          .set('Authorization', 'Bearer decano')
          .send({ nombre: 'No existe' });

        expect(res.status).toBe(404);
      });

      it('PUT /universidades/:id - retornar 403 como DOCENTE', async () => {
        autenticarComo('DOCENTE', 1);

        const res = await request(app)
          .put('/api/parametrizacion/universidades/1')
          .set('Authorization', 'Bearer docente')
          .send({ nombre: 'Test' });

        expect(res.status).toBe(403);
      });
    });

    // ─── Eliminar (soft-delete) ─────────────────────────────────────────
    describe('DELETE - eliminar registros (soft delete)', () => {
      it('DELETE /universidades/:id - debe hacer soft delete en cascada como RECTOR', async () => {
        autenticarComo('RECTOR', 3);
        const registro = {
          id: 1, activo: true,
          update: jest.fn().mockResolvedValue(true),
        };
        mockUniversidad.findOne.mockResolvedValue(registro);
        mockFacultad.findAll.mockResolvedValue([]); // sin hijas

        const res = await request(app)
          .delete('/api/parametrizacion/universidades/1')
          .set('Authorization', 'Bearer rector');

        expect(res.status).toBe(200);
        expect(registro.update).toHaveBeenCalledWith({ activo: false });
        expect(res.body).toHaveProperty('mensaje', 'Universidad y todos sus registros asociados eliminados correctamente');
      });

      it('DELETE /universidades/:id - retornar 404 si no existe', async () => {
        autenticarComo('RECTOR', 3);
        mockUniversidad.findOne.mockResolvedValue(null);

        const res = await request(app)
          .delete('/api/parametrizacion/universidades/999')
          .set('Authorization', 'Bearer rector');

        expect(res.status).toBe(404);
      });

      it('DELETE /universidades/:id - retornar 403 como DOCENTE', async () => {
        autenticarComo('DOCENTE', 1);

        const res = await request(app)
          .delete('/api/parametrizacion/universidades/1')
          .set('Authorization', 'Bearer docente');

        expect(res.status).toBe(403);
      });

      it('DELETE /actividades/:id - soft delete de actividad', async () => {
        autenticarComo('DECANO', 2);
        const registro = {
          id: 1, activo: true,
          update: jest.fn().mockResolvedValue(true),
        };
        mockActividad.findOne.mockResolvedValue(registro);

        const res = await request(app)
          .delete('/api/parametrizacion/actividades/1')
          .set('Authorization', 'Bearer decano');

        expect(res.status).toBe(200);
      });
    });
  });

  // ─── Sin autenticación ───────────────────────────────────────────────────
  describe('Sin autenticación', () => {
    it('GET /universidades debe retornar 401 sin token', async () => {
      const res = await request(app).get('/api/parametrizacion/universidades');
      expect(res.status).toBe(401);
    });

    it('POST /universidades debe retornar 401 sin token', async () => {
      const res = await request(app)
        .post('/api/parametrizacion/universidades')
        .send({ nombre: 'Test' });
      expect(res.status).toBe(401);
    });

    it('DELETE /criterios debe retornar 401 sin token', async () => {
      const res = await request(app).delete('/api/parametrizacion/criterios/1');
      expect(res.status).toBe(401);
    });
  });
});
