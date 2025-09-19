const express = require("express");
const upload = require("../../middlewares/upload.js");
const router = express.Router();

const {
  getCategorias,
  getCategoriaById,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  getMarcas,
  getMarcaById,
  createMarca,
  updateMarca,
  deleteMarca,
} = require("../../controllers/categorias-marcas/categorias-marcas.controller");

// =============================================
// RUTAS DE CATEGORÍAS
// =============================================

// Obtener todas las categorías
router.get("/categorias", getCategorias);

// Obtener categoría por ID
router.get("/categorias/:id", getCategoriaById);

// Crear nueva categoría
router.post("/categorias", createCategoria);

// Actualizar categoría
router.put("/categorias/:id", updateCategoria);

// Eliminar categoría
router.delete("/categorias/:id", deleteCategoria);

// =============================================
// RUTAS DE MARCAS
// =============================================

// Obtener todas las marcas
router.get("/marcas", getMarcas);

// Obtener marca por ID
router.get("/marcas/:id", getMarcaById);

// Crear nueva marca (con logo opcional)
router.post("/marcas", upload.single("logo"), createMarca);

// Actualizar marca (con logo opcional)
router.put("/marcas/:id", upload.single("logo"), updateMarca);

// Eliminar marca
router.delete("/marcas/:id", deleteMarca);

module.exports = router;
