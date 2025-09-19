const pool = require("../../database/config");

// ============= FUNCIONES AUXILIARES PARA IMÁGENES =============

// Guardar múltiples imágenes de un producto
const saveProductImages = async (productId, images, connection = null) => {
  const db = connection || pool;

  try {
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      await db.query(
        `INSERT INTO imagenes_productos (
          producto_id, url, texto_alternativo, es_principal, orden_visualizacion
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          productId,
          image.path, // URL de Cloudinary
          image.originalname || `Imagen ${i + 1}`,
          i === 0 ? 1 : 0, // La primera imagen es principal
          i + 1,
        ]
      );
    }
  } catch (error) {
    console.error("Error guardando imágenes del producto:", error);
    throw error;
  }
};

// Obtener imágenes de un producto
const getProductImages = async (productId) => {
  try {
    const [images] = await pool.query(
      `SELECT id, url, texto_alternativo, es_principal, orden_visualizacion, fecha_creacion
       FROM imagenes_productos 
       WHERE producto_id = ? 
       ORDER BY orden_visualizacion ASC`,
      [productId]
    );
    return images;
  } catch (error) {
    console.error("Error obteniendo imágenes del producto:", error);
    throw error;
  }
};

// Eliminar una imagen específica
const deleteProductImage = async (imageId, productId) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM imagenes_productos WHERE id = ? AND producto_id = ?",
      [imageId, productId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error("Error eliminando imagen del producto:", error);
    throw error;
  }
};

// Actualizar imagen principal
const setMainProductImage = async (imageId, productId) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Quitar principal de todas las imágenes del producto
    await connection.query(
      "UPDATE imagenes_productos SET es_principal = 0 WHERE producto_id = ?",
      [productId]
    );

    // Establecer la imagen seleccionada como principal
    await connection.query(
      "UPDATE imagenes_productos SET es_principal = 1 WHERE id = ? AND producto_id = ?",
      [imageId, productId]
    );

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    console.error("Error estableciendo imagen principal:", error);
    throw error;
  } finally {
    connection.release();
  }
};

// ============= CONTROLADORES PRINCIPALES =============

// Obtener todos los productos
const getProductos = async (req, res) => {
  try {
    const [productos] = await pool.query(
      `SELECT 
        p.*,
        ip.url as imagen_principal
      FROM productos p
      LEFT JOIN imagenes_productos ip ON p.id = ip.producto_id AND ip.es_principal = 1
      ORDER BY p.id DESC`
    );

    res.json({
      message: "Productos obtenidos con éxito",
      productos: productos,
      total: productos.length,
    });
  } catch (error) {
    console.error("Error obteniendo productos:", error);
    res.status(500).json({ error: error.message });
  }
};

// Obtener un producto por ID
const getProductoById = async (req, res) => {
  try {
    const { id } = req.params;
    const [producto] = await pool.query(
      `SELECT 
        p.*,
        m.nombre as marca_nombre,
        c.nombre as categoria_nombre
      FROM productos p
      LEFT JOIN marcas m ON p.marca_id = m.id
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.id = ?`,
      [id]
    );

    if (producto.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    // Obtener todas las imágenes del producto
    const imagenes = await getProductImages(id);

    // Combinar producto con sus imágenes
    const productoCompleto = {
      ...producto[0],
      imagenes: imagenes,
    };

    res.json({
      message: "Producto obtenido con éxito",
      producto: productoCompleto,
    });
  } catch (error) {
    console.error("Error obteniendo producto:", error);
    res.status(500).json({ error: error.message });
  }
};

// Crear un nuevo producto
const createProducto = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const {
      nombre,
      descripcion,
      precio,
      precio_original,
      marca_id,
      categoria_id,
      stock,
      calificacion,
      codigo_sku,
      peso,
      dimensiones,
      activo,
      destacado,
      meta_titulo,
      meta_descripcion,
    } = req.body;

    // Validar que marca_id existe si se proporciona
    if (marca_id) {
      const [marca] = await connection.query(
        "SELECT id FROM marcas WHERE id = ?",
        [marca_id]
      );
      if (marca.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          error: `La marca con ID ${marca_id} no existe. Usa una marca válida o deja marca_id vacío para usar la marca por defecto.`,
        });
      }
    }

    // Validar que categoria_id existe si se proporciona
    if (categoria_id) {
      const [categoria] = await connection.query(
        "SELECT id FROM categorias WHERE id = ?",
        [categoria_id]
      );
      if (categoria.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          error: `La categoría con ID ${categoria_id} no existe. Usa una categoría válida o deja categoria_id vacío para usar la categoría por defecto.`,
        });
      }
    }

    // Insertar producto (sin imagen_url para mantener compatibilidad)
    const [result] = await connection.query(
      `INSERT INTO productos (
        nombre, descripcion, precio, precio_original, calificacion, stock, 
        categoria_id, marca_id, codigo_sku, peso, dimensiones, activo, 
        destacado, meta_titulo, meta_descripcion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre,
        descripcion,
        parseFloat(precio),
        precio_original ? parseFloat(precio_original) : null,
        calificacion ? parseFloat(calificacion) : 0.0,
        stock ? parseInt(stock) : 0,
        categoria_id || 1,
        marca_id || 1,
        codigo_sku || null,
        peso ? parseFloat(peso) : null,
        dimensiones || null,
        activo !== undefined ? Boolean(activo) : true,
        destacado !== undefined ? Boolean(destacado) : false,
        meta_titulo || null,
        meta_descripcion || null,
      ]
    );

    const productId = result.insertId;

    // Procesar imágenes si se enviaron
    let imagenesGuardadas = [];

    // Determinar qué tipo de upload se está usando
    let filesToProcess = [];

    // LOGS DE DEPURACIÓN
    console.log("🔍 DEBUG - Upload Info:");
    console.log("  req.files type:", typeof req.files);
    console.log("  req.file:", req.file ? "exists" : "undefined");

    // Manejar diferentes formatos de upload
    if (req.files) {
      if (Array.isArray(req.files)) {
        // Caso: upload.array("imagenes") - req.files es array directo
        filesToProcess = req.files;
        console.log("  🔸 Array format, files:", filesToProcess.length);
      } else if (typeof req.files === "object") {
        // Caso: upload.fields() - req.files es objeto con propiedades
        const allFiles = [];

        if (req.files.imagen && req.files.imagen.length > 0) {
          allFiles.push(...req.files.imagen);
          console.log(
            "  🔸 Found imagen field, files:",
            req.files.imagen.length
          );
        }

        if (req.files.imagenes && req.files.imagenes.length > 0) {
          allFiles.push(...req.files.imagenes);
          console.log(
            "  🔸 Found imagenes field, files:",
            req.files.imagenes.length
          );
        }

        filesToProcess = allFiles;
        console.log("  🔸 Fields format, total files:", filesToProcess.length);
      }
    } else if (req.file) {
      // Caso: upload.single("imagen")
      filesToProcess = [req.file];
      console.log("  🔸 Single file format, file:", req.file.originalname);
    }

    console.log("  📁 Final files to process:", filesToProcess.length);

    if (filesToProcess.length > 0) {
      console.log("  🚀 Saving images to database...");
      console.log(
        "  📄 Files:",
        filesToProcess.map((f) => f.originalname)
      );

      await saveProductImages(productId, filesToProcess, connection);
      imagenesGuardadas = filesToProcess.map((file, index) => ({
        url: file.path,
        es_principal: index === 0 ? 1 : 0,
        orden_visualizacion: index + 1,
      }));
      console.log(
        "  ✅ Images saved successfully, count:",
        imagenesGuardadas.length
      );
    } else {
      console.log("  ⚠️  No files to process");
    }

    await connection.commit();

    // Obtener el producto completo con sus imágenes
    const [newProduct] = await pool.query(
      "SELECT * FROM productos WHERE id = ?",
      [productId]
    );

    const imagenes = await getProductImages(productId);

    res.status(201).json({
      message: "Producto creado con éxito",
      producto_id: productId,
      producto: {
        ...newProduct[0],
        imagenes: imagenes,
      },
      imagenes_guardadas: imagenesGuardadas.length,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error creando producto:", error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};
// Actualizar un producto
const updateProducto = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const {
      nombre,
      descripcion,
      precio,
      precio_original,
      marca_id,
      categoria_id,
      stock,
      calificacion,
      codigo_sku,
      peso,
      dimensiones,
      activo,
      destacado,
      meta_titulo,
      meta_descripcion,
      replaceImages, // Booleano para saber si reemplazar todas las imágenes o solo agregar
    } = req.body;

    // Verificar que el producto existe
    const [existingProduct] = await connection.query(
      "SELECT id FROM productos WHERE id = ?",
      [id]
    );

    if (existingProduct.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    // Validar marca_id si se proporciona
    if (marca_id) {
      const [marca] = await connection.query(
        "SELECT id FROM marcas WHERE id = ?",
        [marca_id]
      );
      if (marca.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          error: `La marca con ID ${marca_id} no existe.`,
        });
      }
    }

    // Validar categoria_id si se proporciona
    if (categoria_id) {
      const [categoria] = await connection.query(
        "SELECT id FROM categorias WHERE id = ?",
        [categoria_id]
      );
      if (categoria.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          error: `La categoría con ID ${categoria_id} no existe.`,
        });
      }
    }

    // Actualizar datos del producto
    const [result] = await connection.query(
      `UPDATE productos SET 
        nombre = ?, descripcion = ?, precio = ?, precio_original = ?, marca_id = ?, 
        categoria_id = ?, stock = ?, calificacion = ?, codigo_sku = ?, peso = ?, 
        dimensiones = ?, activo = ?, destacado = ?, meta_titulo = ?, meta_descripcion = ?
      WHERE id = ?`,
      [
        nombre,
        descripcion,
        parseFloat(precio),
        precio_original ? parseFloat(precio_original) : null,
        marca_id || 1,
        categoria_id || 1,
        stock ? parseInt(stock) : 0,
        calificacion ? parseFloat(calificacion) : 0.0,
        codigo_sku || null,
        peso ? parseFloat(peso) : null,
        dimensiones || null,
        activo !== undefined ? Boolean(activo) : true,
        destacado !== undefined ? Boolean(destacado) : false,
        meta_titulo || null,
        meta_descripcion || null,
        id,
      ]
    );

    // Procesar imágenes si se enviaron
    let filesToProcess = [];

    console.log("📁 req.files:", req.files);
    console.log("📁 req.file:", req.file);

    // Manejar upload.any() - todos los archivos en req.files con fieldname
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      // Filtrar archivos de imagen (cualquier campo que termine en 'imagen' o 'imagenes')
      filesToProcess = req.files.filter(
        (file) =>
          file.fieldname === "imagen" ||
          file.fieldname === "imagenes" ||
          file.fieldname.includes("imagen")
      );
      console.log(
        `📸 Archivos de imagen encontrados: ${filesToProcess.length}`
      );
      filesToProcess.forEach((file, index) => {
        console.log(
          `   ${index + 1}. Campo: ${file.fieldname}, Archivo: ${
            file.originalname
          }`
        );
      });
    } else if (req.file) {
      // Fallback para upload.single()
      filesToProcess = [req.file];
      console.log("📸 Archivo único encontrado:", req.file.originalname);
    }

    if (filesToProcess.length > 0) {
      if (replaceImages === "true" || replaceImages === true) {
        // Eliminar todas las imágenes existentes
        await connection.query(
          "DELETE FROM imagenes_productos WHERE producto_id = ?",
          [id]
        );
      }

      // Agregar nuevas imágenes
      if (filesToProcess.length > 0) {
        // Si se eliminaron todas, la primera nueva imagen será principal
        const shouldSetFirstAsMain =
          replaceImages === "true" || replaceImages === true;

        // Obtener el último orden si no se reemplazan todas
        let startOrder = 1;
        if (!shouldSetFirstAsMain) {
          const [lastOrder] = await connection.query(
            "SELECT MAX(orden_visualizacion) as max_order FROM imagenes_productos WHERE producto_id = ?",
            [id]
          );
          startOrder = (lastOrder[0].max_order || 0) + 1;
        }

        await saveProductImages(id, filesToProcess, connection);

        // Si es reemplazo total, establecer la primera como principal
        if (shouldSetFirstAsMain) {
          await connection.query(
            "UPDATE imagenes_productos SET es_principal = 1 WHERE producto_id = ? ORDER BY orden_visualizacion ASC LIMIT 1",
            [id]
          );
        }
      }
    }

    await connection.commit();

    // Obtener el producto actualizado con sus imágenes
    const [updatedProduct] = await pool.query(
      "SELECT * FROM productos WHERE id = ?",
      [id]
    );

    const imagenes = await getProductImages(id);

    res.json({
      message: "Producto actualizado con éxito",
      producto: {
        ...updatedProduct[0],
        imagenes: imagenes,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error actualizando producto:", error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};
// Eliminar un producto
const deleteProducto = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query("DELETE FROM productos WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    res.json({
      message: "Producto eliminado con éxito",
    });
  } catch (error) {
    console.error("Error eliminando producto:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============= CONTROLADORES PARA GESTIÓN DE IMÁGENES =============

// Agregar imágenes a un producto existente
const addProductImages = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el producto existe
    const [producto] = await pool.query(
      "SELECT id FROM productos WHERE id = ?",
      [id]
    );
    if (producto.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    // Para esta función, usar req.files directamente ya que viene de upload.array específico
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No se proporcionaron imágenes" });
    }

    // Obtener el último orden de visualización
    const [lastOrder] = await pool.query(
      "SELECT MAX(orden_visualizacion) as max_order FROM imagenes_productos WHERE producto_id = ?",
      [id]
    );

    let startOrder = (lastOrder[0].max_order || 0) + 1;

    // Guardar nuevas imágenes
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      await pool.query(
        `INSERT INTO imagenes_productos (
          producto_id, url, texto_alternativo, es_principal, orden_visualizacion
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          id,
          file.path,
          file.originalname || `Imagen ${startOrder + i}`,
          0, // No es principal por defecto
          startOrder + i,
        ]
      );
    }

    // Obtener todas las imágenes actualizadas
    const imagenes = await getProductImages(id);

    res.json({
      message: "Imágenes agregadas con éxito",
      imagenes_agregadas: req.files.length,
      imagenes: imagenes,
    });
  } catch (error) {
    console.error("Error agregando imágenes:", error);
    res.status(500).json({ error: error.message });
  }
};

// Eliminar una imagen específica de un producto
const removeProductImage = async (req, res) => {
  try {
    const { id, imageId } = req.params;

    // Verificar que la imagen existe y pertenece al producto
    const [imagen] = await pool.query(
      "SELECT * FROM imagenes_productos WHERE id = ? AND producto_id = ?",
      [imageId, id]
    );

    if (imagen.length === 0) {
      return res.status(404).json({ message: "Imagen no encontrada" });
    }

    const wasMain = imagen[0].es_principal;

    // Eliminar la imagen
    await pool.query(
      "DELETE FROM imagenes_productos WHERE id = ? AND producto_id = ?",
      [imageId, id]
    );

    // Si era la imagen principal, establecer otra como principal
    if (wasMain) {
      const [firstImage] = await pool.query(
        "SELECT id FROM imagenes_productos WHERE producto_id = ? ORDER BY orden_visualizacion ASC LIMIT 1",
        [id]
      );

      if (firstImage.length > 0) {
        await pool.query(
          "UPDATE imagenes_productos SET es_principal = 1 WHERE id = ?",
          [firstImage[0].id]
        );
      }
    }

    // Obtener imágenes actualizadas
    const imagenes = await getProductImages(id);

    res.json({
      message: "Imagen eliminada con éxito",
      imagenes: imagenes,
    });
  } catch (error) {
    console.error("Error eliminando imagen:", error);
    res.status(500).json({ error: error.message });
  }
};

// Establecer imagen principal
const setMainImage = async (req, res) => {
  try {
    const { id, imageId } = req.params;

    // Verificar que la imagen existe y pertenece al producto
    const [imagen] = await pool.query(
      "SELECT id FROM imagenes_productos WHERE id = ? AND producto_id = ?",
      [imageId, id]
    );

    if (imagen.length === 0) {
      return res.status(404).json({ message: "Imagen no encontrada" });
    }

    await setMainProductImage(imageId, id);

    const imagenes = await getProductImages(id);

    res.json({
      message: "Imagen principal establecida con éxito",
      imagenes: imagenes,
    });
  } catch (error) {
    console.error("Error estableciendo imagen principal:", error);
    res.status(500).json({ error: error.message });
  }
};

// Reordenar imágenes
const reorderImages = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const { imageOrders } = req.body; // Array de {imageId, order}

    if (!imageOrders || !Array.isArray(imageOrders)) {
      return res
        .status(400)
        .json({ error: "Se requiere un array de imageOrders" });
    }

    await connection.beginTransaction();

    // Actualizar el orden de cada imagen
    for (const item of imageOrders) {
      await connection.query(
        "UPDATE imagenes_productos SET orden_visualizacion = ? WHERE id = ? AND producto_id = ?",
        [item.order, item.imageId, id]
      );
    }

    await connection.commit();

    const imagenes = await getProductImages(id);

    res.json({
      message: "Orden de imágenes actualizado con éxito",
      imagenes: imagenes,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error reordenando imágenes:", error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

module.exports = {
  getProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto,
  // Funciones de gestión de imágenes
  addProductImages,
  removeProductImage,
  setMainImage,
  reorderImages,
  // Funciones auxiliares exportadas para uso en otros módulos
  getProductImages,
  saveProductImages,
  deleteProductImage,
  setMainProductImage,
};
