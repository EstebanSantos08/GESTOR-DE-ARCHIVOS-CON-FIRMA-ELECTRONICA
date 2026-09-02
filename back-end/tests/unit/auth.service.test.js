const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock models before requiring authService
const mockUsuario = {
  findOne: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
};

const mockRol = {};
const mockCarrera = {};
const mockFacultad = {};
const mockActividad = {};

const mockSequelize = {
  transaction: jest.fn(async (cb) => {
    return cb({});
  }),
};

jest.mock('../../Model', () => ({
  sequelize: mockSequelize,
  Usuario: mockUsuario,
  Rol: mockRol,
  Carrera: mockCarrera,
  Facultad: mockFacultad,
  Actividad: mockActividad,
}));

const authService = require('../../Services/auth.service');

describe('AuthService (Unit Tests)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registrar', () => {
    const usuarioData = {
      nombre: 'Juan Pérez',
      email: 'juan@test.com',
      password: 'Password123!',
      roles: [1],
    };

    it('debe registrar un nuevo usuario exitosamente', async () => {
      mockUsuario.findOne.mockResolvedValue(null);
      const hashEsperado = 'hashed_password';
      jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashEsperado);

      const uInstance = {
        id: 1,
        setRoles: jest.fn().mockResolvedValue(true),
        setCarreras: jest.fn().mockResolvedValue(true),
        setFacultades: jest.fn().mockResolvedValue(true),
        setActividades: jest.fn().mockResolvedValue(true),
      };
      mockUsuario.create.mockResolvedValue(uInstance);

      const usuarioCompleto = {
        id: 1,
        nombre: usuarioData.nombre,
        email: usuarioData.email,
        password_hash: hashEsperado,
        roles: [{ id: 1, nombre: 'DOCENTE', nivel: 1 }],
        carreras: [],
        facultades: [],
        actividades: [],
        toJSON: function () {
          const { password_hash, ...resto } = this;
          return resto;
        },
      };
      mockUsuario.findByPk.mockResolvedValue(usuarioCompleto);

      const resultado = await authService.registrar(usuarioData);

      expect(mockUsuario.findOne).toHaveBeenCalledWith({
        where: { email: usuarioData.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(usuarioData.password, 12);
      expect(mockUsuario.create).toHaveBeenCalled();
      expect(uInstance.setRoles).toHaveBeenCalledWith([1], expect.any(Object));
      expect(resultado).not.toHaveProperty('password_hash');
      expect(resultado.nombre).toBe(usuarioData.nombre);
      expect(resultado.email).toBe(usuarioData.email);
    });

    it('debe lanzar error si el email ya está registrado', async () => {
      mockUsuario.findOne.mockResolvedValue({ id: 1, email: usuarioData.email });

      await expect(authService.registrar(usuarioData)).rejects.toThrow(
        'El email ya está registrado'
      );
      expect(mockUsuario.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const email = 'juan@test.com';
    const password = 'Password123!';
    const passwordHash = '$2a$12$hashed';

    const construirUsuario = (activo = true) => ({
      id: 1,
      nombre: 'Juan Pérez',
      email,
      password_hash: passwordHash,
      activo,
      roles: [{ id: 1, nombre: 'DOCENTE', nivel: 1 }],
      carreras: [{ id: 10, nombre: 'Sistemas' }],
      toJSON: function () {
        const { password_hash, ...resto } = this;
        return resto;
      },
    });

    it('debe iniciar sesión exitosamente y devolver token + usuario', async () => {
      const usuario = construirUsuario();
      mockUsuario.findOne.mockResolvedValue(usuario);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      jest.spyOn(jwt, 'sign').mockReturnValue('token_jwt_valido');

      const resultado = await authService.login(email, password);

      expect(mockUsuario.findOne).toHaveBeenCalledWith({
        where: { email, activo: true },
        include: [
          { model: mockRol, as: 'roles' },
          { model: mockCarrera, as: 'carreras', attributes: ['id', 'nombre'] },
        ],
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(password, passwordHash);
      expect(resultado).toHaveProperty('token', 'token_jwt_valido');
      expect(resultado).toHaveProperty('usuario');
      expect(resultado.usuario).not.toHaveProperty('password_hash');
    });

    it('debe lanzar error con credenciales inválidas (usuario no existe)', async () => {
      mockUsuario.findOne.mockResolvedValue(null);

      await expect(authService.login(email, password)).rejects.toThrow(
        'Credenciales inválidas'
      );
    });

    it('debe lanzar error con credenciales inválidas (password incorrecto)', async () => {
      mockUsuario.findOne.mockResolvedValue(construirUsuario());
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      await expect(authService.login(email, password)).rejects.toThrow(
        'Credenciales inválidas'
      );
    });
  });

  describe('verificarToken', () => {
    it('debe verificar un token JWT válido', () => {
      const payload = { id: 1, email: 'test@test.com', roles: ['DOCENTE'], nivel: 1 };
      jest.spyOn(jwt, 'verify').mockReturnValue(payload);

      const resultado = authService.verificarToken('token_valido');
      expect(resultado).toEqual(payload);
    });

    it('debe lanzar error con un token inválido', () => {
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      expect(() => authService.verificarToken('token_invalido')).toThrow('jwt malformed');
    });
  });

  describe('_omitirPassword', () => {
    it('debe eliminar password_hash del objeto usuario', () => {
      const usuario = {
        id: 1,
        nombre: 'Test',
        password_hash: 'secret',
        toJSON: function () {
          const { password_hash, ...resto } = this;
          return resto;
        },
      };

      const resultado = authService._omitirPassword(usuario);
      expect(resultado).not.toHaveProperty('password_hash');
      expect(resultado).toHaveProperty('nombre', 'Test');
    });
  });
});
