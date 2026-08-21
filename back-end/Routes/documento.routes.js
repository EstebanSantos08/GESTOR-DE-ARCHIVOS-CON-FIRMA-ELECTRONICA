const router = require('express').Router();
const { autenticar } = require('../Middleware/auth.middleware');
const { autorizar } = require('../Middleware/rbac.middleware');
const ctrl = require('../Controller/documento.controller');

// Subir documentos — cualquier usuario autenticado puede subir
router.post('/subir',
  autenticar,
  ctrl.upload.single('archivo'),
  ctrl.subirDocumento
);

router.get('/resumen', autenticar, ctrl.resumenDocumentos);
router.get('/', autenticar, ctrl.listarDocumentos);
router.get('/:id', autenticar, ctrl.obtenerDocumento);
router.get('/:id/descargar', autenticar, ctrl.descargarDocumento);
router.delete('/:id', autenticar, ctrl.eliminarDocumento);

// Firmar — el workflow valida que el usuario sea el firmante asignado
router.post('/:id/firmar',
  autenticar,
  ctrl.firmarDocumento
);

// Rechazar — el workflow valida que el usuario sea el firmante asignado
router.post('/:id/rechazar',
  autenticar,
  ctrl.rechazarDocumento
);

module.exports = router;

