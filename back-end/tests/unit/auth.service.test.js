const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock models before requiring authService
const mockUsuario = {
  findOne: jest.fn(),
  create: jest.fn(),
};

const mockRol = {};

jest.mock('../../Model', () => ({
  Usuario: mockUsuario,
  Rol: mockRol,
}));

const authService = require('../../Services/auth.service');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registrar', () => {
    const usuarioData = {
      nombre: 'Juan Pérez',
      email: 'juan@test.com',
      password: 'Password123!',
      rol_id: 1,
    };

    it('debe registrar un nuevo usuario exitosamente', async () => {
      mockUsuario.findOne.mockResolvedValue(null);
      const hashEsperado = 'hashed_password';
      jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashEsperado);

      const usuarioCreado = {
        id: 1,
        nombre: usuarioData.nombre,
        email: usuarioData.email,
        password_hash: hashEsperado,
        rol_id: usuarioData.rol_id,
        toJSON: function () {
          const { password_hash, ...resto } = this;
          return resto;
        },
      };
      mockUsuario.create.mockResolvedValue(usuarioCreado);

      const resultado = await authService.registrar(usuarioData);

      expect(mockUsuario.findOne).toHaveBeenCalledWith({
        where: { email: usuarioData.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(usuarioData.password, 12);
      expect(mockUsuario.create).toHaveBeenCalledWith({
        nombre: usuarioData.nombre,
        email: usuarioData.email,
        password_hash: hashEsperado,
        rol_id: usuarioData.rol_id,
      });
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
    const rolData = { id: 1, nombre: 'DOCENTE', nivel: 1 };

    const construirUsuario = (activo = true) => ({
      id: 1,
      nombre: 'Juan Pérez',
      email,
      password_hash: passwordHash,
      rol_id: 1,
      activo,
      rol: rolData,
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
        include: [{ model: mockRol, as: 'rol' }],
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(password, passwordHash);
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          id: usuario.id,
          email: usuario.email,
          rol: usuario.rol.nombre,
          nivel: usuario.rol.nivel,
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
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

    it('debe lanzar error si el usuario está inactivo', async () => {
      mockUsuario.findOne.mockResolvedValue(null);

      await expect(authService.login(email, password)).rejects.toThrow(
        'Credenciales inválidas'
      );
      // Verify it only looks for active users
      expect(mockUsuario.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ activo: true }),
        })
      );
    });
  });

  describe('verificarToken', () => {
    it('debe verificar un token JWT válido', () => {
      const payload = { id: 1, email: 'test@test.com', rol: 'DOCENTE', nivel: 1 };
      const token = jwt.sign(payload, process.env.JWT_SECRET);

      const resultado = authService.verificarToken(token);

      expect(resultado).toMatchObject(payload);
    });

    it('debe lanzar error con un token inválido', () => {
      expect(() => authService.verificarToken('token-invalido')).toThrow();
    });
  });

  describe('_omitirPassword', () => {
    it('debe eliminar password_hash del objeto usuario', () => {
      const usuario = {
        id: 1,
        nombre: 'Test',
        email: 'test@test.com',
        password_hash: 'secreto',
        toJSON: function () {
          return { ...this };
        },
      };

      const resultado = authService._omitirPassword(usuario);

      expect(resultado).not.toHaveProperty('password_hash');
      expect(resultado.id).toBe(1);
      expect(resultado.nombre).toBe('Test');
    });
  });
});
