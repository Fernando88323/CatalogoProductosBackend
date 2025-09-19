const pool = require("../../database/config");

// =============================================
// CONTROLADORES DE CATEGORÍAS
// =============================================

const getCategorias = async (req, res) => {
  try {
    const { activo = true } = req.query;

    const [categorias] = await pool.query(
      `
      SELECT c.*, COUNT(p.id) as total_productos
      FROM categorias c
      LEFT JOIN productos p ON c.id = p.categoria_id AND p.activo = TRUE
      WHERE c.activo = ?
      GROUP BY c.id
      ORDER BY c.nombre ASC
    `,
      [activo === "true"]
    );

    res.json({
      message: "Categorías obtenidas con éxito",
      categorias: categorias,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCategoriaById = async (req, res) => {
  try {
    const { id } = req.params;

    const [categoria] = await pool.query(
      `
      SELECT c.*, COUNT(p.id) as total_productos
      FROM categorias c
      LEFT JOIN productos p ON c.id = p.categoria_id AND p.activo = TRUE
      WHERE c.id = ?
      GROUP BY c.id
    `,
      [id]
    );

    if (categoria.length === 0) {
      return res.status(404).json({ message: "Categoría no encontrada" });
    }

    res.json({
      message: "Categoría obtenida con éxito",
      categoria: categoria[0],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createCategoria = async (req, res) => {
  try {
    const { nombre, descripcion, slug } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: "El nombre es requerido" });
    }

    const finalSlug = slug || nombre.toLowerCase().replace(/\s+/g, "-");

    const [result] = await pool.query(
      `
      INSERT INTO categorias (nombre, descripcion, slug) 
      VALUES (?, ?, ?)
    `,
      [nombre, descripcion, finalSlug]
    );

    res.status(201).json({
      message: "Categoría creada con éxito",
      categoria_id: result.insertId,
      slug: finalSlug,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      res
        .status(400)
        .json({ error: "Ya existe una categoría con ese nombre o slug" });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

const updateCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, slug, activo } = req.body;

    const [result] = await pool.query(
      `
      UPDATE categorias 
      SET nombre = ?, descripcion = ?, slug = ?, activo = ?
      WHERE id = ?
    `,
      [nombre, descripcion, slug, activo, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Categoría no encontrada" });
    }

    res.json({
      message: "Categoría actualizada con éxito",
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      res
        .status(400)
        .json({ error: "Ya existe una categoría con ese nombre o slug" });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

const deleteCategoria = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si hay productos en esta categoría
    const [productos] = await pool.query(
      "SELECT COUNT(*) as total FROM productos WHERE categoria_id = ?",
      [id]
    );

    if (productos[0].total > 0) {
      return res.status(400).json({
        error:
          "No se puede eliminar la categoría porque tiene productos asociados",
        productos_asociados: productos[0].total,
      });
    }

    const [result] = await pool.query("DELETE FROM categorias WHERE id = ?", [
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Categoría no encontrada" });
    }

    res.json({
      message: "Categoría eliminada con éxito",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// =============================================
// CONTROLADORES DE MARCAS
// =============================================

const getMarcas = async (req, res) => {
  try {
    const { activo = true } = req.query;

    const [marcas] = await pool.query(
      `
      SELECT m.*, COUNT(p.id) as total_productos
      FROM marcas m
      LEFT JOIN productos p ON m.id = p.marca_id AND p.activo = TRUE
      WHERE m.activo = ?
      GROUP BY m.id
      ORDER BY m.nombre ASC
    `,
      [activo === "true"]
    );

    res.json({
      message: "Marcas obtenidas con éxito",
      marcas: marcas,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMarcaById = async (req, res) => {
  try {
    const { id } = req.params;

    const [marca] = await pool.query(
      `
      SELECT m.*, COUNT(p.id) as total_productos
      FROM marcas m
      LEFT JOIN productos p ON m.id = p.marca_id AND p.activo = TRUE
      WHERE m.id = ?
      GROUP BY m.id
    `,
      [id]
    );

    if (marca.length === 0) {
      return res.status(404).json({ message: "Marca no encontrada" });
    }

    res.json({
      message: "Marca obtenida con éxito",
      marca: marca[0],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createMarca = async (req, res) => {
  try {
    const { nombre, descripcion, url_sitio_web } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: "El nombre es requerido" });
    }

    // Si se subió logo, usar la URL de Cloudinary
    const url_logo = req.file ? req.file.path : null;

    const [result] = await pool.query(
      `
      INSERT INTO marcas (nombre, descripcion, url_logo, url_sitio_web) 
      VALUES (?, ?, ?, ?)
    `,
      [nombre, descripcion, url_logo, url_sitio_web]
    );

    res.status(201).json({
      message: "Marca creada con éxito",
      marca_id: result.insertId,
      url_logo: url_logo,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      res.status(400).json({ error: "Ya existe una marca con ese nombre" });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

const updateMarca = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, url_sitio_web, activo } = req.body;

    // Si se subió nuevo logo, usar la nueva URL
    const url_logo = req.file ? req.file.path : req.body.url_logo;

    const [result] = await pool.query(
      `
      UPDATE marcas 
      SET nombre = ?, descripcion = ?, url_logo = ?, url_sitio_web = ?, activo = ?
      WHERE id = ?
    `,
      [nombre, descripcion, url_logo, url_sitio_web, activo, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Marca no encontrada" });
    }

    res.json({
      message: "Marca actualizada con éxito",
      url_logo: url_logo,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      res.status(400).json({ error: "Ya existe una marca con ese nombre" });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

const deleteMarca = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si hay productos de esta marca
    const [productos] = await pool.query(
      "SELECT COUNT(*) as total FROM productos WHERE marca_id = ?",
      [id]
    );

    if (productos[0].total > 0) {
      return res.status(400).json({
        error: "No se puede eliminar la marca porque tiene productos asociados",
        productos_asociados: productos[0].total,
      });
    }

    const [result] = await pool.query("DELETE FROM marcas WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Marca no encontrada" });
    }

    res.json({
      message: "Marca eliminada con éxito",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  // Categorías
  getCategorias,
  getCategoriaById,
  createCategoria,
  updateCategoria,
  deleteCategoria,

  // Marcas
  getMarcas,
  getMarcaById,
  createMarca,
  updateMarca,
  deleteMarca,
};
