const express = require("express");
const router = express.Router();

const {
  getMarcas,
  getImage,
} = require("../../controllers/marcas/marcas.controller");

// Aquí puedes definir las rutas específicas para "marcas"
router.get("/obtenerMarcas", getMarcas);
router.post("/obtenerImagen", getImage);

module.exports = router;
