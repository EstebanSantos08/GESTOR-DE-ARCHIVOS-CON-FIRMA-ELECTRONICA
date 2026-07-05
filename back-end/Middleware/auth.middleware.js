const authService = require('../Services/auth.service');

/**
 * Extrae y valida el JWT del header Authorization: Bearer <token>.
 * Adjunta el payload decodificado en req.usuario.
 */
function autenticar(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticación requerido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    req.usuario = authService.verificarToken(token);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sesión expirada, inicie sesión nuevamente' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
}

module.exports = { autenticar };
