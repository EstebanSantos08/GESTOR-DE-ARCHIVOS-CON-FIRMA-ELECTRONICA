const express = require('express');
const router = express.Router();
const { autenticar } = require('../Middleware/auth.middleware');
const { autorizarAdmin } = require('../Middleware/rbac.middleware');
const flujosController = require('../Controller/flujos.controller');

router.use(autenticar);

router.get('/', flujosController.listarFlujos);
router.post('/', autorizarAdmin(), flujosController.crearFlujo);
router.put('/:id', autorizarAdmin(), flujosController.actualizarFlujo);
router.delete('/:id', autorizarAdmin(), flujosController.eliminarFlujo);

module.exports = router;
