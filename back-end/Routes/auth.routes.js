const router = require('express').Router();
const { body } = require('express-validator');
const { autenticar } = require('../Middleware/auth.middleware');
const { autorizar } = require('../Middleware/rbac.middleware');
const ctrl = require('../Controller/auth.controller');

// Flujo de autenticación y gestión básica de usuarios.
router.post('/login',
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Contraseña requerida'),
  ctrl.login
);

// Solo RECTOR puede registrar nuevos usuarios
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

module.exports = router;
