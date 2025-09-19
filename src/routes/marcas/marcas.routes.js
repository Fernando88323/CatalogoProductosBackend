const express = require("express");
const router = express.Router();

const { getMarcas } = require("../../controllers/marcas/marcas.controller");

// Aquí puedes definir las rutas específicas para "marcas"
router.get("/obtenerMarcas", getMarcas);

module.exports = router;
