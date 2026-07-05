const request = require('supertest');
const express = require('express');

// Mocks must be defined before jest.mock
const mockUsuarioFindByPk = jest.fn();

jest.mock('../../Services/auth.service', () => ({
  login: jest.fn(),
  registrar: jest.fn(),
  verificarToken: jest.fn(),
}));

jest.mock('../../Model', () => ({
  Usuario: { findByPk: mockUsuarioFindByPk },
  Rol: {},
}));

const authRoutes = require('../../Routes/auth.routes');
const authService = require('../../Services/auth.service');

// Crear app de prueba
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
  });
  return app;
}

const app = createApp();

describe('Auth Routes - Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── POST /api/auth/login ─────────────────────────────────────────────
  describe('POST /api/auth/login', () => {
    it('debe iniciar sesión exitosamente', async () => {
      authService.login.mockResolvedValue({
        token: 'jwt_token',
        usuario: { id: 1, nombre: 'Juan', email: 'juan@test.com' },
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'juan@test.com', password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token', 'jwt_token');
      expect(res.body).toHaveProperty('usuario');
      expect(authService.login).toHaveBeenCalledWith('juan@test.com', 'Password123!');
    });

    it('debe retornar 401 con credenciales inválidas', async () => {
      authService.login.mockRejectedValue(new Error('Credenciales inválidas'));

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'wrong@test.com', password: 'wrong' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Credenciales inválidas');
    });

    it('debe retornar 400 si falta email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'Password123!' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errores');
    });

    it('debe retornar 400 si falta password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errores');
    });

    it('debe retornar 400 con email inválido', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'no-es-email', password: 'Password123!' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errores');
    });
  });

  // ─── POST /api/auth/registrar ─────────────────────────────────────────
  describe('POST /api/auth/registrar', () => {
    const tokenRector = 'token_rector';
    const usuarioData = {
      nombre: 'Nuevo Usuario',
      email: 'nuevo@test.com',
      password: 'Password123!',
      rol_id: 1,
    };

    beforeEach(() => {
      authService.verificarToken.mockReturnValue({
        id: 1, email: 'rector@test.com', rol: 'RECTOR', nivel: 3,
      });
    });

    it('debe registrar un usuario exitosamente (como RECTOR)', async () => {
      authService.registrar.mockResolvedValue({
        id: 2, nombre: usuarioData.nombre, email: usuarioData.email,
      });

      const res = await request(app)
        .post('/api/auth/registrar')
        .set('Authorization', `Bearer ${tokenRector}`)
        .send(usuarioData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('nombre', usuarioData.nombre);
      expect(authService.registrar).toHaveBeenCalledWith(usuarioData);
    });

    it('debe retornar 403 si no es RECTOR', async () => {
      authService.verificarToken.mockReturnValue({
        id: 2, email: 'decano@test.com', rol: 'DECANO', nivel: 2,
      });

      const res = await request(app)
        .post('/api/auth/registrar')
        .set('Authorization', `Bearer ${tokenRector}`)
        .send(usuarioData);

      expect(res.status).toBe(403);
      expect(authService.registrar).not.toHaveBeenCalled();
    });

    it('debe retornar 401 si no hay token', async () => {
      const res = await request(app)
        .post('/api/auth/registrar')
        .send(usuarioData);

      expect(res.status).toBe(401);
    });

    it('debe retornar 400 si faltan campos requeridos', async () => {
      const res = await request(app)
        .post('/api/auth/registrar')
        .set('Authorization', `Bearer ${tokenRector}`)
        .send({ nombre: 'Test' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errores');
    });

    it('debe retornar 400 si la contraseña es muy corta', async () => {
      const res = await request(app)
        .post('/api/auth/registrar')
        .set('Authorization', `Bearer ${tokenRector}`)
        .send({ ...usuarioData, password: '123' });

      expect(res.status).toBe(400);
    });
  });

  // ─── GET /api/auth/perfil ─────────────────────────────────────────────
  describe('GET /api/auth/perfil', () => {
    const tokenValido = 'token_valido';

    beforeEach(() => {
      authService.verificarToken.mockReturnValue({
        id: 1, email: 'docente@test.com', rol: 'DOCENTE', nivel: 1,
      });
    });

    it('debe retornar el perfil del usuario autenticado', async () => {
      mockUsuarioFindByPk.mockResolvedValue({
        id: 1, nombre: 'Juan Docente', email: 'docente@test.com',
        rol: { id: 1, nombre: 'DOCENTE' },
      });

      const res = await request(app)
        .get('/api/auth/perfil')
        .set('Authorization', `Bearer ${tokenValido}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('nombre', 'Juan Docente');
    });

    it('debe retornar 404 si el usuario no existe', async () => {
      mockUsuarioFindByPk.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/auth/perfil')
        .set('Authorization', `Bearer ${tokenValido}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Usuario no encontrado');
    });

    it('debe retornar 401 sin token', async () => {
      const res = await request(app).get('/api/auth/perfil');
      expect(res.status).toBe(401);
    });
  });
});
