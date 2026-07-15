const router = require('express').Router();
const { autenticar } = require('../Middleware/auth.middleware');
const { autorizar } = require('../Middleware/rbac.middleware');
const ctrl = require('../Controller/documento.controller');

// Endpoints del ciclo completo de documentos: carga, consulta, firma, rechazo y descarga.
// Cualquier rol autenticado puede subir y listar
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

// Solo DECANO y RECTOR pueden firmar
router.post('/:id/firmar',
  autenticar,
  autorizar('DECANO', 'RECTOR'),
  ctrl.firmarDocumento
);

// Solo DECANO y RECTOR pueden rechazar
router.post('/:id/rechazar',
  autenticar,
  autorizar('DECANO', 'RECTOR'),
  ctrl.rechazarDocumento
);

module.exports = router;
