const { autorizar, autorizarNivel } = require('../../Middleware/rbac.middleware');

describe('RBAC Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  // ─── autorizar ──────────────────────────────────────────────────────────
  describe('autorizar', () => {
    it('debe permitir el paso si el rol está entre los permitidos', () => {
      req.usuario = { rol: 'DECANO', nivel: 2 };
      const middleware = autorizar('DECANO', 'RECTOR');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('debe denegar acceso si el rol no está permitido', () => {
      req.usuario = { rol: 'DOCENTE', nivel: 1 };
      const middleware = autorizar('DECANO', 'RECTOR');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Acceso denegado. Roles requeridos: DECANO, RECTOR',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('debe retornar 401 si no hay usuario autenticado', () => {
      req.usuario = undefined;
      const middleware = autorizar('RECTOR');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No autenticado',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('debe permitir acceso a RECTOR cuando se requieren múltiples roles', () => {
      req.usuario = { rol: 'RECTOR', nivel: 3 };
      const middleware = autorizar('DECANO', 'RECTOR');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('debe denegar acceso a RECTOR si no está en la lista', () => {
      req.usuario = { rol: 'RECTOR', nivel: 3 };
      const middleware = autorizar('DECANO');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ─── autorizarNivel ─────────────────────────────────────────────────────
  describe('autorizarNivel', () => {
    it('debe permitir el paso si el nivel es >= al mínimo', () => {
      req.usuario = { rol: 'DECANO', nivel: 2 };
      const middleware = autorizarNivel(2);

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('debe permitir el paso si el nivel es mayor al mínimo', () => {
      req.usuario = { rol: 'RECTOR', nivel: 3 };
      const middleware = autorizarNivel(2);

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('debe denegar acceso si el nivel es menor al mínimo', () => {
      req.usuario = { rol: 'DOCENTE', nivel: 1 };
      const middleware = autorizarNivel(2);

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Permisos insuficientes',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('debe retornar 401 si no hay usuario autenticado', () => {
      req.usuario = undefined;
      const middleware = autorizarNivel(1);

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No autenticado' });
      expect(next).not.toHaveBeenCalled();
    });

    it('debe permitir acceso a RECTOR (nivel 3) con nivel mínimo 1', () => {
      req.usuario = { rol: 'RECTOR', nivel: 3 };
      const middleware = autorizarNivel(1);

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
