const express = require("express");
const pool = require("../../database/config");
const router = express.Router();

// Obtener información de referencia (marcas y categorías disponibles)
router.get("/referencia", async (req, res) => {
  try {
    // Obtener marcas disponibles
    const [marcas] = await pool.query(`
      SELECT id, nombre, descripcion, activo 
      FROM marcas 
      WHERE activo = TRUE 
      ORDER BY nombre ASC
    `);

    // Obtener categorías disponibles
    const [categorias] = await pool.query(`
      SELECT id, nombre, descripcion, slug, activo 
      FROM categorias 
      WHERE activo = TRUE 
      ORDER BY nombre ASC
    `);

    res.json({
      message: "Información de referencia obtenida con éxito",
      marcas: marcas,
      categorias: categorias,
      uso: {
        marcas:
          "Usa cualquier ID de la lista de marcas, o deja vacío para usar 'Sin Marca' (ID: 1)",
        categorias:
          "Usa cualquier ID de la lista de categorías, o deja vacío para usar 'General' (ID: 1)",
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint de salud para verificar conexiones
router.get("/health", async (req, res) => {
  try {
    // Verificar conexión a la base de datos
    const [result] = await pool.query("SELECT 1 as test");

    // Contar registros en las tablas principales
    const [productCount] = await pool.query(
      "SELECT COUNT(*) as total FROM productos"
    );
    const [marcaCount] = await pool.query(
      "SELECT COUNT(*) as total FROM marcas"
    );
    const [categoriaCount] = await pool.query(
      "SELECT COUNT(*) as total FROM categorias"
    );

    res.json({
      status: "ok",
      message: "Sistema funcionando correctamente",
      database: "conectada",
      estadisticas: {
        productos: productCount[0].total,
        marcas: marcaCount[0].total,
        categorias: categoriaCount[0].total,
      },
      cloudinary: {
        cloud_name: process.env.CLOUD_NAME,
        configurado:
          !!process.env.CLOUD_NAME &&
          !!process.env.API_KEY &&
          !!process.env.API_SECRET,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error del sistema",
      error: error.message,
    });
  }
});

module.exports = router;
