const jwt = require('jsonwebtoken');

// Mock authService
jest.mock('../../Services/auth.service', () => ({
  verificarToken: jest.fn(),
}));

const authService = require('../../Services/auth.service');
const { autenticar } = require('../../Middleware/auth.middleware');

describe('Auth Middleware - autenticar', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it('debe permitir el paso con un token Bearer válido', () => {
    req.headers['authorization'] = 'Bearer token_valido';
    const payload = { id: 1, email: 'test@test.com', rol: 'DOCENTE', nivel: 1 };
    authService.verificarToken.mockReturnValue(payload);

    autenticar(req, res, next);

    expect(authService.verificarToken).toHaveBeenCalledWith('token_valido');
    expect(req.usuario).toEqual(payload);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('debe retornar 401 si no hay header Authorization', () => {
    autenticar(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Token de autenticación requerido',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('debe retornar 401 si el header no comienza con Bearer', () => {
    req.headers['authorization'] = 'Basic token123';

    autenticar(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Token de autenticación requerido',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('debe retornar 401 si el token es inválido', () => {
    req.headers['authorization'] = 'Bearer token_invalido';
    authService.verificarToken.mockImplementation(() => {
      const err = new Error('jwt malformed');
      err.name = 'JsonWebTokenError';
      throw err;
    });

    autenticar(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Token inválido',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('debe retornar 401 si el token ha expirado', () => {
    req.headers['authorization'] = 'Bearer token_expirado';
    authService.verificarToken.mockImplementation(() => {
      const err = new Error('jwt expired');
      err.name = 'TokenExpiredError';
      throw err;
    });

    autenticar(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Sesión expirada, inicie sesión nuevamente',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('debe rechazar token con espacios extras (no es un JWT válido)', () => {
    req.headers['authorization'] = 'Bearer   token_con_espacios';
    authService.verificarToken.mockImplementation(() => {
      const err = new Error('jwt malformed');
      err.name = 'JsonWebTokenError';
      throw err;
    });

    autenticar(req, res, next);

    // El split(' ')[1] devuelve cadena vacía con espacios múltiples
    expect(authService.verificarToken).toHaveBeenCalledWith('');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido' });
    expect(next).not.toHaveBeenCalled();
  });
});
