const express = require("express");
const router = express.Router();

// Rutas originales (compatibilidad)
// router.use("/productos", require("./productos/productos.routes"));
router.use("/marcas", require("./marcas/marcas.routes"));

router.use("/upload", require("./uploadRoutes/upload.routes"));

router.use("/auth", require("../routes/login/login.routes"));

module.exports = router;
