const router = require('express').Router();
const { body } = require('express-validator');
const { autenticar } = require('../Middleware/auth.middleware');
const { autorizar } = require('../Middleware/rbac.middleware');
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

// Solo RECTOR puede crear usuarios con rol específico
router.post('/registrar',
  autenticar,
  autorizar('RECTOR'),
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

// Gestión de usuarios — Decano y Rector
router.get('/usuarios', autenticar, autorizar('DECANO', 'RECTOR'), ctrl.listarUsuarios);
router.put('/usuarios/:id/rol', autenticar, autorizar('DECANO', 'RECTOR'), ctrl.actualizarRol);
router.put('/usuarios/:id', autenticar, autorizar('DECANO', 'RECTOR'), ctrl.actualizarUsuario);
router.delete('/usuarios/:id', autenticar, autorizar('DECANO', 'RECTOR'), ctrl.eliminarUsuario);

module.exports = router;
