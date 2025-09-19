const express = require("express");
const router = express.Router();

// Rutas originales (compatibilidad)
router.use("/productos", require("./productos/productos.routes"));
router.use("/marcas", require("./marcas/marcas.routes"));

// Nuevas rutas con soporte completo de Cloudinary
router.use(
  "/api/productos",
  require("./productos/productos-cloudinary.routes")
);
router.use("/api", require("./categorias-marcas/categorias-marcas.routes"));

// Rutas de información y salud del sistema
router.use("/info", require("./info/info.routes"));

module.exports = router;
