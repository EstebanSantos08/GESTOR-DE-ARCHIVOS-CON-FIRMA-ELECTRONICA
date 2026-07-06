/**
 * Autorización basada en roles (RBAC).
 * Uso: router.get('/ruta', autenticar, autorizar('RECTOR', 'DECANO'), handler)
 *
 * Los roles van de menor a mayor nivel jerárquico:
 * DOCENTE (1) < DECANO (2) < RECTOR (3)
 */
function autorizar(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: `Acceso denegado. Roles requeridos: ${rolesPermitidos.join(', ')}`,
      });
    }

    next();
  };
}

/**
 * Permite el acceso si el nivel del usuario es >= al nivel mínimo requerido.
 * Ej: autorizarNivel(2) permite DECANO y RECTOR.
 */
function autorizarNivel(nivelMinimo) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (req.usuario.nivel < nivelMinimo) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    next();
  };
}

module.exports = { autorizar, autorizarNivel };
