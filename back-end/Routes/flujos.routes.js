const express = require('express');
const router = express.Router();
const { autenticar } = require('../Middleware/auth.middleware');
const { autorizarAdmin } = require('../Middleware/rbac.middleware');
const flujosController = require('../Controller/flujos.controller');

router.use(autenticar);
router.use(autorizarAdmin()); // Solo el admin gestiona los flujos

router.get('/', flujosController.listarFlujos);
router.post('/', flujosController.crearFlujo);
router.put('/:id', flujosController.actualizarFlujo);
router.delete('/:id', flujosController.eliminarFlujo);

module.exports = router;
