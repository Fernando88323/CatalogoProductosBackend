const pool = require("../../database/config");
const cloudinary = require("../../config/cloudinary");

// Función helper para manejar imágenes
const saveProductImages = async (productId, files, isMainImage = false) => {
  if (!files || files.length === 0) return [];

  const images = Array.isArray(files) ? files : [files];
  const savedImages = [];

  for (let i = 0; i < images.length; i++) {
    const file = images[i];
    const isMain = isMainImage && i === 0; // La primera imagen es principal

    await pool.query(
      `
      INSERT INTO imagenes_productos (producto_id, url, public_id, texto_alternativo, es_principal, orden_visualizacion)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [productId, file.path, file.filename, `Imagen ${i + 1}`, isMain, i + 1]
    );

    savedImages.push({
      url: file.path,
      public_id: file.filename,
      es_principal: isMain,
      orden: i + 1,
    });
  }

  return savedImages;
};

// Obtener todos los productos con sus imágenes
const getProductos = async (req, res) => {
  try {
    const {
      categoria,
      destacado,
      activo = true,
      limit = 50,
      offset = 0,
    } = req.query;

    let query = `
      SELECT 
        p.*,
        c.nombre as categoria_nombre,
        c.slug as categoria_slug,
        m.nombre as marca_nombre,
        GROUP_CONCAT(
          CASE WHEN ip.es_principal = 1 THEN ip.url END
        ) as imagen_principal,
        COUNT(DISTINCT ip.id) as total_imagenes
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN marcas m ON p.marca_id = m.id
      LEFT JOIN imagenes_productos ip ON p.id = ip.producto_id
      WHERE p.activo = ?
    `;

    const params = [activo === "true"];

    if (categoria) {
      query += ` AND c.slug = ?`;
      params.push(categoria);
    }

    if (destacado) {
      query += ` AND p.destacado = ?`;
      params.push(destacado === "true");
    }

    query += ` GROUP BY p.id ORDER BY p.fecha_creacion DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [productos] = await pool.query(query, params);

    res.json({
      message: "Productos obtenidos con éxito",
      productos: productos,
      total: productos.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener un producto por ID con todas sus imágenes
const getProductoById = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener datos del producto
    const [producto] = await pool.query(
      `
      SELECT 
        p.*,
        c.nombre as categoria_nombre,
        c.slug as categoria_slug,
        m.nombre as marca_nombre,
        m.url_logo as marca_logo
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN marcas m ON p.marca_id = m.id
      WHERE p.id = ? AND p.activo = TRUE
    `,
      [id]
    );

    if (producto.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    // Obtener todas las imágenes del producto
    const [imagenes] = await pool.query(
      `
      SELECT id, url, public_id, texto_alternativo, es_principal, orden_visualizacion
      FROM imagenes_productos 
      WHERE producto_id = ?
      ORDER BY es_principal DESC, orden_visualizacion ASC
    `,
      [id]
    );

    res.json({
      message: "Producto obtenido con éxito",
      producto: {
        ...producto[0],
        imagenes: imagenes,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Crear un nuevo producto con imágenes
const createProducto = async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      precio,
      precio_original,
      categoria_id,
      marca_id,
      stock,
      codigo_sku,
      destacado,
    } = req.body;

    // Insertar producto
    const [result] = await pool.query(
      `
      INSERT INTO productos (
        nombre, descripcion, precio, precio_original, categoria_id, marca_id, 
        stock, codigo_sku, destacado, imagen_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        nombre,
        descripcion,
        parseFloat(precio),
        precio_original ? parseFloat(precio_original) : null,
        categoria_id || 1,
        marca_id || 1,
        stock || 0,
        codigo_sku || null,
        destacado === "true" || false,
        req.file ? req.file.path : null, // Imagen principal para compatibilidad
      ]
    );

    const productId = result.insertId;

    // Guardar imágenes si las hay
    let savedImages = [];
    if (req.file) {
      savedImages = await saveProductImages(productId, req.file, true);
    } else if (req.files && req.files.length > 0) {
      savedImages = await saveProductImages(productId, req.files, true);
    }

    res.status(201).json({
      message: "Producto creado con éxito",
      producto_id: productId,
      imagenes: savedImages,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: error.message });
  }
};

// Actualizar un producto
const updateProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      descripcion,
      precio,
      precio_original,
      categoria_id,
      marca_id,
      stock,
      codigo_sku,
      destacado,
    } = req.body;

    // Verificar que el producto existe
    const [existingProduct] = await pool.query(
      "SELECT id FROM productos WHERE id = ?",
      [id]
    );
    if (existingProduct.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    // Actualizar producto
    await pool.query(
      `
      UPDATE productos SET 
        nombre = ?, descripcion = ?, precio = ?, precio_original = ?,
        categoria_id = ?, marca_id = ?, stock = ?, codigo_sku = ?, destacado = ?,
        imagen_url = COALESCE(?, imagen_url)
      WHERE id = ?
    `,
      [
        nombre,
        descripcion,
        parseFloat(precio),
        precio_original ? parseFloat(precio_original) : null,
        categoria_id || 1,
        marca_id || 1,
        stock || 0,
        codigo_sku || null,
        destacado === "true" || false,
        req.file ? req.file.path : null,
        id,
      ]
    );

    // Guardar nuevas imágenes si las hay
    let savedImages = [];
    if (req.file) {
      // Marcar otras imágenes como no principales
      await pool.query(
        "UPDATE imagenes_productos SET es_principal = FALSE WHERE producto_id = ?",
        [id]
      );
      savedImages = await saveProductImages(id, req.file, true);
    } else if (req.files && req.files.length > 0) {
      savedImages = await saveProductImages(id, req.files, false);
    }

    res.json({
      message: "Producto actualizado con éxito",
      producto_id: id,
      nuevas_imagenes: savedImages,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: error.message });
  }
};

// Eliminar un producto
const deleteProducto = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener imágenes del producto para eliminarlas de Cloudinary
    const [imagenes] = await pool.query(
      "SELECT public_id FROM imagenes_productos WHERE producto_id = ?",
      [id]
    );

    // Eliminar imágenes de Cloudinary
    for (const imagen of imagenes) {
      if (imagen.public_id) {
        try {
          await cloudinary.uploader.destroy(imagen.public_id);
        } catch (cloudinaryError) {
          console.log(
            "Error eliminando imagen de Cloudinary:",
            cloudinaryError.message
          );
        }
      }
    }

    // Eliminar producto (las imágenes se eliminan automáticamente por CASCADE)
    const [result] = await pool.query("DELETE FROM productos WHERE id = ?", [
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    res.json({
      message: "Producto eliminado con éxito",
      imagenes_eliminadas: imagenes.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Eliminar una imagen específica del producto
const deleteProductImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    // Obtener información de la imagen
    const [imagen] = await pool.query(
      "SELECT * FROM imagenes_productos WHERE id = ?",
      [imageId]
    );

    if (imagen.length === 0) {
      return res.status(404).json({ message: "Imagen no encontrada" });
    }

    // Eliminar de Cloudinary
    if (imagen[0].public_id) {
      await cloudinary.uploader.destroy(imagen[0].public_id);
    }

    // Eliminar de la base de datos
    await pool.query("DELETE FROM imagenes_productos WHERE id = ?", [imageId]);

    // Si era la imagen principal, marcar otra como principal
    if (imagen[0].es_principal) {
      await pool.query(
        `
        UPDATE imagenes_productos 
        SET es_principal = TRUE 
        WHERE producto_id = ? 
        ORDER BY orden_visualizacion ASC 
        LIMIT 1
      `,
        [imagen[0].producto_id]
      );
    }

    res.json({
      message: "Imagen eliminada con éxito",
      imagen_eliminada: imagen[0],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Establecer imagen principal
const setMainImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    // Obtener información de la imagen
    const [imagen] = await pool.query(
      "SELECT producto_id FROM imagenes_productos WHERE id = ?",
      [imageId]
    );

    if (imagen.length === 0) {
      return res.status(404).json({ message: "Imagen no encontrada" });
    }

    const productId = imagen[0].producto_id;

    // Quitar marca principal de otras imágenes
    await pool.query(
      "UPDATE imagenes_productos SET es_principal = FALSE WHERE producto_id = ?",
      [productId]
    );

    // Marcar como principal
    await pool.query(
      "UPDATE imagenes_productos SET es_principal = TRUE WHERE id = ?",
      [imageId]
    );

    // Actualizar URL principal en productos para compatibilidad
    const [newMainImage] = await pool.query(
      "SELECT url FROM imagenes_productos WHERE id = ?",
      [imageId]
    );
    await pool.query("UPDATE productos SET imagen_url = ? WHERE id = ?", [
      newMainImage[0].url,
      productId,
    ]);

    res.json({
      message: "Imagen principal actualizada con éxito",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto,
  deleteProductImage,
  setMainImage,
};
