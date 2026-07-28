const router = require('express').Router();
const { body } = require('express-validator');
const { autenticar } = require('../Middleware/auth.middleware');
const { autorizar, autorizarAdmin } = require('../Middleware/rbac.middleware');
const ctrl = require('../Controller/auth.controller');

router.post('/login',
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Contraseña requerida'),
  ctrl.login
);

// Registro público — asigna rol DOCENTE por defecto
router.post('/registro',
  body('nombre').notEmpty().withMessage('Nombre requerido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 8 }).withMessage('Contraseña mínimo 8 caracteres'),
  ctrl.registroPublico
);

// Solo ADMINISTRADOR puede crear usuarios con rol específico
router.post('/registrar',
  autenticar,
  autorizarAdmin(),
  body('nombre').notEmpty().withMessage('Nombre requerido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 8 }).withMessage('Contraseña mínimo 8 caracteres'),
  body('rol_id').isInt().withMessage('Rol inválido'),
  ctrl.registrar
);

router.get('/perfil', autenticar, ctrl.perfil);

// Lista de roles disponibles — para poblar selects de asignación
router.get('/roles', autenticar, async (req, res) => {
  const { Rol } = require('../Model');
  const roles = await Rol.findAll({ order: [['nivel', 'ASC']] });
  res.json(roles);
});
// Gestión de Contraseñas
router.post('/cambiar-password', autenticar, ctrl.cambiarPassword);
router.post('/recuperar-password', ctrl.solicitarRecuperacion);
router.post('/reset-password', ctrl.resetPassword);

// Gestión de usuarios — Solo ADMINISTRADOR
router.get('/usuarios', autenticar, autorizarAdmin(), ctrl.listarUsuarios);
router.put('/usuarios/:id/rol', autenticar, autorizarAdmin(), ctrl.actualizarRol);
router.put('/usuarios/:id', autenticar, ctrl.actualizarUsuario);
router.put('/usuarios/:id/password', autenticar, autorizarAdmin(), ctrl.adminResetPassword);
router.delete('/usuarios/:id', autenticar, autorizarAdmin(), ctrl.eliminarUsuario);

module.exports = router;
