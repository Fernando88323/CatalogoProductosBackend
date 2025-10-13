const express = require("express");
const router = express.Router();

// Ruta de bienvenida / API info
router.get("/", (req, res) => {
  res.status(200).json({
    message: "API Catálogo de Productos - Backend",
    version: "1.0.0",
    status: "online",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/health",
      auth: "/auth/login",
      marcas: "/marcas",
      upload: "/upload",
    },
    documentation: "https://github.com/Fernando88323/CatalogoProductosBackend",
  });
});

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is running",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  });
});

// Rutas originales (compatibilidad)
// router.use("/productos", require("./productos/productos.routes"));
router.use("/marcas", require("./marcas/marcas.routes"));

router.use("/upload", require("./uploadRoutes/upload.routes"));

router.use("/auth", require("../routes/login/login.routes"));

module.exports = router;
