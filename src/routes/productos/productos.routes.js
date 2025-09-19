const express = require("express");
const upload = require("../../middlewares/upload.js");
const cloudinary = require("../../config/cloudinary.js");
const router = express.Router();

const {
  getProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto,
  // Nuevas funciones para gestión de imágenes
  addProductImages,
  removeProductImage,
  setMainImage,
  reorderImages,
} = require("../../controllers/productos/productos.controller");

// Rutas básicas sin upload
router.get("/obtenerProductos", getProductos);
router.get("/obtenerProducto/:id", getProductoById);
router.delete("/eliminarProducto/:id", deleteProducto);

// Rutas principales - SOPORTE UNIVERSAL PARA CUALQUIER CANTIDAD DE IMÁGENES
router.post("/crearProducto", upload.any(), createProducto);

router.put("/actualizarProducto/:id", upload.any(), updateProducto);

// Rutas específicas (mantener por compatibilidad)
router.post("/crearProductoSingle", upload.single("imagen"), createProducto);
router.post(
  "/crearProductoMultiple",
  upload.array("imagenes", 10),
  createProducto
);
router.put(
  "/actualizarProductoMultiple/:id",
  upload.array("imagenes", 10),
  updateProducto
);

// Rutas para gestión de imágenes de productos existentes
router.post(
  "/productos/:id/imagenes",
  upload.array("imagenes", 10),
  addProductImages
);
router.delete("/productos/:id/imagenes/:imageId", removeProductImage);
router.put("/productos/:id/imagenes/:imageId/principal", setMainImage);
router.put("/productos/:id/imagenes/reordenar", reorderImages);
router.put(
  "/actualizarProductoSingle/:id",
  upload.single("imagen"),
  updateProducto
);

// Ruta específica para subir solo imagen
router.post("/upload", upload.single("imagen"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No se ha proporcionado ninguna imagen",
      });
    }

    return res.json({
      message: "Imagen subida con éxito",
      url: req.file.path, // URL pública de Cloudinary
      public_id: req.file.filename, // ID público para eliminación
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Ruta para subir múltiples imágenes
router.post("/uploadMultiple", upload.array("imagenes", 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: "No se han proporcionado imágenes",
      });
    }

    const urls = req.files.map((file) => ({
      url: file.path,
      public_id: file.filename,
    }));

    return res.json({
      message: "Imágenes subidas con éxito",
      imagenes: urls,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Ruta para eliminar imagen de Cloudinary
router.delete("/deleteImage", async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({
        error: "Public ID es requerido",
      });
    }

    // Eliminar de Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "ok") {
      return res.json({
        message: "Imagen eliminada con éxito",
        result: result,
      });
    } else {
      return res.status(400).json({
        error: "No se pudo eliminar la imagen",
        result: result,
      });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
