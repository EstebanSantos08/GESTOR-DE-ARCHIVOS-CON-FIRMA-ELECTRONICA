/**
 * Autorización basada en roles (RBAC).
 * Uso: router.get('/ruta', autenticar, autorizar('RECTOR', 'DECANO'), handler)
 *
 * Los roles van de menor a mayor nivel jerárquico:
 * RESPONSABLE_AREA(1) < DOCENTE(2) < DIRECTOR_CARRERA(3) < SUBDECANO(4) < DECANO(5) < RECTOR(6) < ADMINISTRADOR(7)
 */
function autorizar(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!req.usuario.roles || !req.usuario.roles.some(r => rolesPermitidos.includes(r))) {
      return res.status(403).json({
        error: `Acceso denegado. Roles requeridos: ${rolesPermitidos.join(', ')}`,
      });
    }

    next();
  };
}

/**
 * Permite el acceso si el nivel del usuario es >= al nivel mínimo requerido.
 * Ej: autorizarNivel(3) permite DIRECTOR_CARRERA, SUBDECANO, DECANO, RECTOR y ADMINISTRADOR.
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

/**
 * Atajo para rutas exclusivas del ADMINISTRADOR (nivel 7).
 * Uso: router.post('/ruta', autenticar, autorizarAdmin(), handler)
 */
function autorizarAdmin() {
  return autorizar('ADMINISTRADOR');
}

module.exports = { autorizar, autorizarNivel, autorizarAdmin };

