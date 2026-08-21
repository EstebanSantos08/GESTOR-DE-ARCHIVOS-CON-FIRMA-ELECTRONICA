const router = require('express').Router();
const { body } = require('express-validator');
const { autenticar } = require('../Middleware/auth.middleware');
const { autorizarAdmin } = require('../Middleware/rbac.middleware');
const {
  universidadCtrl,
  facultadCtrl,
  carreraCtrl,
  periodoCtrl,
  criterioCtrl,
  indicadorCtrl,
  actividadCtrl,
  estructura,
  asignarUsuariosActividad,
  asignarResponsablesIndicador,
} = require('../Controller/parametrizacion.controller');

// Solo ADMINISTRADOR puede crear/editar/eliminar parametrización
const soloAdmin = [autenticar, autorizarAdmin()];

// Árbol completo para el explorador de archivos (todos los autenticados)
router.get('/estructura', autenticar, estructura);

// ─── Universidad ───────────────────────────────────────────────────────────
router.get('/universidades', autenticar, universidadCtrl.listar);
router.get('/universidades/:id', autenticar, universidadCtrl.obtener);
router.post('/universidades', ...soloAdmin,
  body('nombre').notEmpty().withMessage('Nombre requerido'),
  universidadCtrl.crear
);
router.put('/universidades/:id', ...soloAdmin, universidadCtrl.actualizar);
router.delete('/universidades/:id', ...soloAdmin, universidadCtrl.eliminar);

// ─── Facultad ──────────────────────────────────────────────────────────────
router.get('/facultades', autenticar, facultadCtrl.listar);
router.get('/facultades/:id', autenticar, facultadCtrl.obtener);
router.post('/facultades', ...soloAdmin,
  body('nombre').notEmpty().withMessage('Nombre requerido'),
  body('universidad_id').isInt().withMessage('Universidad requerida'),
  facultadCtrl.crear
);
router.put('/facultades/:id', ...soloAdmin, facultadCtrl.actualizar);
router.delete('/facultades/:id', ...soloAdmin, facultadCtrl.eliminar);

// ─── Carrera ───────────────────────────────────────────────────────────────
router.get('/carreras', autenticar, carreraCtrl.listar);
router.get('/carreras/:id', autenticar, carreraCtrl.obtener);
router.post('/carreras', ...soloAdmin,
  body('nombre').notEmpty().withMessage('Nombre requerido'),
  body('facultad_id').isInt().withMessage('Facultad requerida'),
  carreraCtrl.crear
);
router.put('/carreras/:id', ...soloAdmin, carreraCtrl.actualizar);
router.delete('/carreras/:id', ...soloAdmin, carreraCtrl.eliminar);

// ─── Periodo ───────────────────────────────────────────────────────────────
router.get('/periodos', autenticar, periodoCtrl.listar);
router.get('/periodos/:id', autenticar, periodoCtrl.obtener);
router.post('/periodos', ...soloAdmin,
  body('nombre').notEmpty().withMessage('Nombre requerido'),
  body('carrera_id').isInt().withMessage('Carrera requerida'),
  periodoCtrl.crear
);
router.put('/periodos/:id', ...soloAdmin, periodoCtrl.actualizar);
router.delete('/periodos/:id', ...soloAdmin, periodoCtrl.eliminar);

// ─── Criterio ──────────────────────────────────────────────────────────────
router.get('/criterios', autenticar, criterioCtrl.listar);
router.get('/criterios/:id', autenticar, criterioCtrl.obtener);
router.post('/criterios', ...soloAdmin,
  body('nombre').notEmpty().withMessage('Nombre requerido'),
  criterioCtrl.crear
);
router.put('/criterios/:id', ...soloAdmin, criterioCtrl.actualizar);
router.delete('/criterios/:id', ...soloAdmin, criterioCtrl.eliminar);

// ─── Indicador ─────────────────────────────────────────────────────────────
router.get('/indicadores', autenticar, indicadorCtrl.listar);
router.get('/indicadores/:id', autenticar, indicadorCtrl.obtener);
router.post('/indicadores', ...soloAdmin,
  body('nombre').notEmpty().withMessage('Nombre requerido'),
  body('numero').isInt().withMessage('Número de indicador requerido'),
  body('criterio_id').isInt().withMessage('Criterio requerido'),
  indicadorCtrl.crear
);
router.put('/indicadores/:id', ...soloAdmin, indicadorCtrl.actualizar);
router.delete('/indicadores/:id', ...soloAdmin, indicadorCtrl.eliminar);
router.post('/indicadores/:id/responsables', ...soloAdmin,
  body('responsablesIds').isArray().withMessage('responsablesIds debe ser un arreglo'),
  asignarResponsablesIndicador
);

// ─── Actividad ─────────────────────────────────────────────────────────────
router.get('/actividades', autenticar, actividadCtrl.listar);
router.get('/actividades/:id', autenticar, actividadCtrl.obtener);
router.post('/actividades', ...soloAdmin,
  body('nombre').notEmpty().withMessage('Nombre requerido'),
  body('indicador_id').isInt().withMessage('Indicador requerido'),
  actividadCtrl.crear
);
router.put('/actividades/:id', ...soloAdmin, actividadCtrl.actualizar);
router.delete('/actividades/:id', ...soloAdmin, actividadCtrl.eliminar);
router.post('/actividades/:id/usuarios', ...soloAdmin,
  body('usuariosIds').isArray().withMessage('usuariosIds debe ser un arreglo'),
  asignarUsuariosActividad
);

module.exports = router;

