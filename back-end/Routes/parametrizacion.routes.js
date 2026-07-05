const router = require('express').Router();
const { body } = require('express-validator');
const { autenticar } = require('../Middleware/auth.middleware');
const { autorizarNivel } = require('../Middleware/rbac.middleware');
const {
  universidadCtrl,
  facultadCtrl,
  criterioCtrl,
  actividadCtrl,
} = require('../Controller/parametrizacion.controller');

// Solo DECANO y RECTOR (nivel >= 2) gestionan parametrización
const soloAdmins = [autenticar, autorizarNivel(2)];

// ─── Universidad ───────────────────────────────────────────────────────────
router.get('/universidades', autenticar, universidadCtrl.listar);
router.get('/universidades/:id', autenticar, universidadCtrl.obtener);
router.post('/universidades', ...soloAdmins,
  body('nombre').notEmpty().withMessage('Nombre requerido'),
  universidadCtrl.crear
);
router.put('/universidades/:id', ...soloAdmins, universidadCtrl.actualizar);
router.delete('/universidades/:id', ...soloAdmins, universidadCtrl.eliminar);

// ─── Facultad ──────────────────────────────────────────────────────────────
router.get('/facultades', autenticar, facultadCtrl.listar);
router.get('/facultades/:id', autenticar, facultadCtrl.obtener);
router.post('/facultades', ...soloAdmins,
  body('nombre').notEmpty().withMessage('Nombre requerido'),
  body('universidad_id').isInt().withMessage('Universidad requerida'),
  facultadCtrl.crear
);
router.put('/facultades/:id', ...soloAdmins, facultadCtrl.actualizar);
router.delete('/facultades/:id', ...soloAdmins, facultadCtrl.eliminar);

// ─── Criterio ──────────────────────────────────────────────────────────────
router.get('/criterios', autenticar, criterioCtrl.listar);
router.get('/criterios/:id', autenticar, criterioCtrl.obtener);
router.post('/criterios', ...soloAdmins,
  body('nombre').notEmpty().withMessage('Nombre requerido'),
  criterioCtrl.crear
);
router.put('/criterios/:id', ...soloAdmins, criterioCtrl.actualizar);
router.delete('/criterios/:id', ...soloAdmins, criterioCtrl.eliminar);

// ─── Actividad ─────────────────────────────────────────────────────────────
router.get('/actividades', autenticar, actividadCtrl.listar);
router.get('/actividades/:id', autenticar, actividadCtrl.obtener);
router.post('/actividades', ...soloAdmins,
  body('nombre').notEmpty().withMessage('Nombre requerido'),
  body('criterio_id').isInt().withMessage('Criterio requerido'),
  actividadCtrl.crear
);
router.put('/actividades/:id', ...soloAdmins, actividadCtrl.actualizar);
router.delete('/actividades/:id', ...soloAdmins, actividadCtrl.eliminar);

module.exports = router;
