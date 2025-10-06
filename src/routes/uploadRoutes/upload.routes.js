// routes/uploadRoutes.js
const express = require("express");
const multer = require("multer");
const {
  uploadImage,
  getProductos,
  getAllProductos,
  getProductosInactivos,
  getProductoById,
  getImagenesProducto,
  updateProducto,
  deleteProducto,
  deleteProductoPermanente,
  reactivarProducto,
} = require("../../controllers/uploadController/upload.controller");

const router = express.Router();
// Usar memoryStorage para recibir las imágenes en el backend y procesarlas
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // límite de 5MB por archivo
    files: 10, // máximo 10 archivos por petición
  },
  fileFilter: (req, file, cb) => {
    // Verificar que sea una imagen
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos de imagen"), false);
    }
  },
});

// ============================================
// RUTAS PARA CREAR Y SUBIR
// ============================================

// Ruta para subir múltiples imágenes
router.post("/upload", upload.array("images", 10), uploadImage); // máximo 10 imágenes

// ============================================
// RUTAS PARA OBTENER DATOS
// ============================================

// IMPORTANTE: Las rutas específicas deben ir ANTES de las rutas con parámetros
// para evitar conflictos de enrutamiento

// Obtener TODOS los productos (activos e inactivos) con sus imágenes
router.get("/productos/all", getAllProductos);

// Obtener solo productos inactivos con sus imágenes
router.get("/productos/inactivos", getProductosInactivos);

// Obtener todos los productos activos con sus imágenes
router.get("/productos", getProductos);

// Obtener un producto específico por ID con sus imágenes
router.get("/productos/:id", getProductoById);

// Obtener solo las imágenes de un producto específico
router.get("/productos/:id/imagenes", getImagenesProducto);

// ============================================
// RUTAS PARA EDITAR Y ELIMINAR
// ============================================

// Actualizar un producto (información y/o imágenes)
// Puede recibir: datos del producto en body + nuevas imágenes + IDs de imágenes a eliminar
router.put("/productos/:id", upload.array("images", 10), updateProducto);

// Reactivar un producto inactivo (cambiar activo = TRUE)
router.patch("/productos/:id/reactivar", reactivarProducto);

// Eliminar producto (soft delete - marca como inactivo)
router.delete("/productos/:id", deleteProducto);

// Eliminar producto permanentemente (hard delete - elimina de DB y Cloudinary)
router.delete("/productos/:id/permanente", deleteProductoPermanente);

module.exports = router;
