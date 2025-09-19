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
  deleteProductImage,
  setMainImage,
} = require("../../controllers/productos/productos-cloudinary.controller");

// =============================================
// RUTAS DE PRODUCTOS
// =============================================

// Obtener productos (con filtros opcionales)
// GET /productos/obtenerProductos?categoria=ropa&destacado=true&limit=10&offset=0
router.get("/obtenerProductos", getProductos);

// Obtener producto específico con todas sus imágenes
router.get("/obtenerProducto/:id", getProductoById);

// Crear producto con imagen única
router.post("/crearProducto", upload.single("imagen"), createProducto);

// Crear producto con múltiples imágenes
router.post(
  "/crearProductoMultiple",
  upload.array("imagenes", 10),
  createProducto
);

// Actualizar producto con nueva imagen (opcional)
router.put("/actualizarProducto/:id", upload.single("imagen"), updateProducto);

// Agregar imágenes adicionales a un producto existente
router.post(
  "/agregarImagenes/:id",
  upload.array("imagenes", 10),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No se proporcionaron imágenes" });
      }

      // Verificar que el producto existe
      const [product] = await require("../../database/config.js").query(
        "SELECT id FROM productos WHERE id = ?",
        [id]
      );
      if (product.length === 0) {
        return res.status(404).json({ message: "Producto no encontrado" });
      }

      // Obtener el siguiente orden de visualización
      const [maxOrder] = await require("../../database/config.js").query(
        "SELECT COALESCE(MAX(orden_visualizacion), 0) + 1 as next_order FROM imagenes_productos WHERE producto_id = ?",
        [id]
      );

      const savedImages = [];
      let order = maxOrder[0].next_order;

      for (const file of req.files) {
        await require("../../database/config.js").query(
          `
        INSERT INTO imagenes_productos (producto_id, url, public_id, texto_alternativo, es_principal, orden_visualizacion)
        VALUES (?, ?, ?, ?, FALSE, ?)
      `,
          [id, file.path, file.filename, `Imagen adicional ${order}`, order]
        );

        savedImages.push({
          url: file.path,
          public_id: file.filename,
          orden: order,
        });
        order++;
      }

      res.json({
        message: "Imágenes agregadas con éxito",
        imagenes_agregadas: savedImages,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Eliminar producto completo
router.delete("/eliminarProducto/:id", deleteProducto);

// =============================================
// RUTAS DE GESTIÓN DE IMÁGENES
// =============================================

// Eliminar imagen específica
router.delete("/eliminarImagen/:imageId", deleteProductImage);

// Establecer imagen como principal
router.put("/imagenPrincipal/:imageId", setMainImage);

// Subir imagen individual (sin asociar a producto)
router.post("/upload", upload.single("imagen"), (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ error: "No se ha proporcionado ninguna imagen" });
    }

    return res.json({
      message: "Imagen subida con éxito",
      url: req.file.path,
      public_id: req.file.filename,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Subir múltiples imágenes (sin asociar a producto)
router.post("/uploadMultiple", upload.array("imagenes", 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ error: "No se han proporcionado imágenes" });
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

// Eliminar imagen de Cloudinary por public_id
router.delete("/deleteImage", async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({ error: "Public ID es requerido" });
    }

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

// =============================================
// RUTAS DE UTILIDAD
// =============================================

// Obtener todas las imágenes de un producto
router.get("/imagenes/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    const [imagenes] = await require("../../database/config.js").query(
      `
      SELECT id, url, public_id, texto_alternativo, es_principal, orden_visualizacion, fecha_creacion
      FROM imagenes_productos 
      WHERE producto_id = ?
      ORDER BY es_principal DESC, orden_visualizacion ASC
    `,
      [productId]
    );

    res.json({
      message: "Imágenes obtenidas con éxito",
      producto_id: productId,
      imagenes: imagenes,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reordenar imágenes
router.put("/reordenar/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const { imageOrders } = req.body; // Array de { imageId, order }

    if (!Array.isArray(imageOrders)) {
      return res.status(400).json({ error: "Se requiere un array de órdenes" });
    }

    for (const item of imageOrders) {
      await require("../../database/config.js").query(
        "UPDATE imagenes_productos SET orden_visualizacion = ? WHERE id = ? AND producto_id = ?",
        [item.order, item.imageId, productId]
      );
    }

    res.json({
      message: "Orden de imágenes actualizado con éxito",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
