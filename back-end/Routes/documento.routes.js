const router = require('express').Router();
const { autenticar } = require('../Middleware/auth.middleware');
const { autorizar } = require('../Middleware/rbac.middleware');
const ctrl = require('../Controller/documento.controller');

// Subir documentos — solo roles que generan evidencia
router.post('/subir',
  autenticar,
  autorizar('DOCENTE', 'RESPONSABLE_AREA', 'DIRECTOR_CARRERA'),
  ctrl.upload.single('archivo'),
  ctrl.subirDocumento
);

router.get('/resumen', autenticar, ctrl.resumenDocumentos);
router.get('/', autenticar, ctrl.listarDocumentos);
router.get('/:id', autenticar, ctrl.obtenerDocumento);
router.get('/:id/descargar', autenticar, ctrl.descargarDocumento);
router.delete('/:id', autenticar, ctrl.eliminarDocumento);

// Firmar — cadena de 4 firmantes: DIRECTOR_CARRERA → SUBDECANO → DECANO → RECTOR
router.post('/:id/firmar',
  autenticar,
  autorizar('DIRECTOR_CARRERA', 'SUBDECANO', 'DECANO', 'RECTOR'),
  ctrl.firmarDocumento
);

// Rechazar — mismos roles que pueden firmar
router.post('/:id/rechazar',
  autenticar,
  autorizar('DIRECTOR_CARRERA', 'SUBDECANO', 'DECANO', 'RECTOR'),
  ctrl.rechazarDocumento
);

module.exports = router;

