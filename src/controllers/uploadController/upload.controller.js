// controllers/uploadController.js
const streamifier = require("streamifier");
const cloudinary = require("../../config/cloudinary");
const pool = require("../../database/config");

// helper: subir buffer a Cloudinary con upload_stream
function uploadBufferToCloudinary(buffer, folder = "catalogo/productos") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        transformation: [
          { width: 800, height: 600, crop: "limit" }, // Optimizar tamaño
          { quality: "auto" }, // Calidad automática
          { fetch_format: "auto" }, // Formato automático
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

// controlador: recibir múltiples imágenes, procesarlas, subirlas a cloudinary y guardar en DB
exports.uploadImage = async (req, res) => {
  try {
    // Verificar que se enviaron archivos
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    console.log(`1. ${req.files.length} imágenes recibidas desde frontend`);

    // Extraer datos del producto desde req.body
    const {
      nombre = "Producto sin nombre",
      descripcion = null,
      precio = 0,
      stock = 0,
      categoria_id = null,
      marca_id = null,
    } = req.body;

    // Iniciar transacción para asegurar consistencia
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 2. Primero crear el producto en la tabla productos
      console.log("2. Creando producto en la base de datos...");

      // Generar slug simple a partir del nombre
      const slug = nombre
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "") // remover caracteres especiales
        .replace(/\s+/g, "-") // reemplazar espacios con guiones
        .replace(/-+/g, "-") // evitar guiones múltiples
        .substring(0, 150); // limitar longitud

      const [productoResult] = await connection.execute(
        `INSERT INTO productos (nombre, descripcion, precio, stock, categoria_id, marca_id, slug, activo) 
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [nombre, descripcion, precio, stock, categoria_id, marca_id, slug]
      );

      const producto_id = productoResult.insertId;
      console.log(`3. Producto creado con ID: ${producto_id}`);

      const resultados = [];
      const errores = [];

      // 4. Procesar cada imagen y guardarla en imagenes_productos
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];

        try {
          console.log(`5.${i + 1}. Procesando imagen: ${file.originalname}`);

          // Subir a Cloudinary
          const cloudRes = await uploadBufferToCloudinary(
            file.buffer,
            "catalogo/productos"
          );

          console.log(
            `6.${i + 1}. Imagen subida a Cloudinary: ${cloudRes.secure_url}`
          );

          // Guardar en tabla imagenes_productos
          console.log(`7.${i + 1}. Guardando imagen en base de datos...`);

          const [imagenResult] = await connection.execute(
            "INSERT INTO imagenes_productos (producto_id, image_url, public_id) VALUES (?, ?, ?)",
            [producto_id, cloudRes.secure_url, cloudRes.public_id]
          );

          console.log(
            `8.${i + 1}. Imagen guardada en DB con ID: ${imagenResult.insertId}`
          );

          // Agregar resultado exitoso
          resultados.push({
            imagen_id: imagenResult.insertId,
            url: cloudRes.secure_url,
            public_id: cloudRes.public_id,
            original_name: file.originalname,
          });
        } catch (error) {
          console.error(`Error procesando imagen ${i + 1}:`, error.message);
          errores.push({
            index: i + 1,
            original_name: file.originalname,
            error: error.message,
          });
        }
      }

      // Si al menos una imagen se subió exitosamente, hacer commit
      if (resultados.length > 0) {
        await connection.commit();
        console.log(
          "9. Transacción confirmada - producto e imágenes guardados"
        );
      } else {
        // Si ninguna imagen se subió, hacer rollback del producto también
        await connection.rollback();
        console.log(
          "9. Transacción cancelada - ninguna imagen se pudo procesar"
        );

        return res.status(500).json({
          success: false,
          message: "No se pudo procesar ninguna imagen, producto no creado",
          data: { errores },
        });
      }

      // Preparar respuesta exitosa
      const response = {
        success: true,
        message: `Producto creado con ${resultados.length} de ${req.files.length} imágenes procesadas exitosamente`,
        data: {
          producto: {
            id: producto_id,
            nombre,
            descripcion,
            precio,
            stock,
            categoria_id,
            marca_id,
            slug,
          },
          imagenes: {
            exitosas: resultados,
            errores: errores,
            total_enviadas: req.files.length,
            total_exitosas: resultados.length,
            total_fallidas: errores.length,
          },
        },
      };

      // Responder con código apropiado
      const statusCode = errores.length > 0 ? 207 : 200; // 207 Multi-Status si hay errores parciales

      res.status(statusCode).json(response);
      console.log(
        `10. Respuesta enviada: Producto ${producto_id} con ${resultados.length} imágenes`
      );
    } catch (dbError) {
      // Error en la transacción, hacer rollback
      await connection.rollback();
      throw dbError;
    } finally {
      // Liberar conexión
      connection.release();
    }
  } catch (err) {
    console.error("Error general en el proceso:", err);
    res.status(500).json({
      success: false,
      error: err.message,
      message: "Error general al procesar el producto y las imágenes",
    });
  }
};

// ============================================
// CONTROLADORES PARA RECUPERAR DATOS
// ============================================

// Controlador: obtener todos los productos con sus imágenes (solo activos)
exports.getProductos = async (req, res) => {
  try {
    console.log("Obteniendo todos los productos activos con imágenes...");

    // Query para obtener productos con sus categorías y marcas
    const productosQuery = `
      SELECT 
        p.id,
        p.nombre,
        p.descripcion,
        p.precio,
        p.stock,
        p.slug,
        p.activo,
        p.fecha_creacion,
        p.fecha_actualizacion,
        c.nombre as categoria_nombre,
        c.id as categoria_id,
        m.nombre as marca_nombre,
        m.id as marca_id
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN marcas m ON p.marca_id = m.id
      WHERE p.activo = TRUE
      ORDER BY p.fecha_creacion DESC
    `;

    const [productos] = await pool.execute(productosQuery);

    // Para cada producto, obtener sus imágenes
    for (let producto of productos) {
      const imagenesQuery = `
        SELECT id, image_url, public_id, fecha_creacion
        FROM imagenes_productos 
        WHERE producto_id = ?
        ORDER BY fecha_creacion ASC
      `;

      const [imagenes] = await pool.execute(imagenesQuery, [producto.id]);
      producto.imagenes = imagenes;
    }

    res.json({
      success: true,
      message: `${productos.length} productos activos encontrados`,
      data: productos,
    });

    console.log(
      `Respuesta enviada: ${productos.length} productos activos con imágenes`
    );
  } catch (err) {
    console.error("Error obteniendo productos:", err);
    res.status(500).json({
      success: false,
      error: err.message,
      message: "Error al obtener los productos",
    });
  }
};

// Controlador: obtener todos los productos (activos e inactivos)
exports.getAllProductos = async (req, res) => {
  try {
    console.log(
      "Obteniendo TODOS los productos (activos e inactivos) con imágenes..."
    );

    // Query para obtener productos con sus categorías y marcas
    const productosQuery = `
      SELECT 
        p.id,
        p.nombre,
        p.descripcion,
        p.precio,
        p.stock,
        p.slug,
        p.activo,
        p.fecha_creacion,
        p.fecha_actualizacion,
        c.nombre as categoria_nombre,
        c.id as categoria_id,
        m.nombre as marca_nombre,
        m.id as marca_id
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN marcas m ON p.marca_id = m.id
      ORDER BY p.activo DESC, p.fecha_creacion DESC
    `;

    const [productos] = await pool.execute(productosQuery);

    // Para cada producto, obtener sus imágenes
    for (let producto of productos) {
      const imagenesQuery = `
        SELECT id, image_url, public_id, fecha_creacion
        FROM imagenes_productos 
        WHERE producto_id = ?
        ORDER BY fecha_creacion ASC
      `;

      const [imagenes] = await pool.execute(imagenesQuery, [producto.id]);
      producto.imagenes = imagenes;
    }

    // Contar productos activos e inactivos
    const activos = productos.filter(
      (p) => p.activo === 1 || p.activo === true
    ).length;
    const inactivos = productos.length - activos;

    res.json({
      success: true,
      message: `${productos.length} productos encontrados (${activos} activos, ${inactivos} inactivos)`,
      data: {
        productos: productos,
        estadisticas: {
          total: productos.length,
          activos: activos,
          inactivos: inactivos,
        },
      },
    });

    console.log(
      `Respuesta enviada: ${productos.length} productos (${activos} activos, ${inactivos} inactivos)`
    );
  } catch (err) {
    console.error("Error obteniendo todos los productos:", err);
    res.status(500).json({
      success: false,
      error: err.message,
      message: "Error al obtener los productos",
    });
  }
};

// Controlador: obtener solo productos inactivos
exports.getProductosInactivos = async (req, res) => {
  try {
    console.log("Obteniendo productos inactivos con imágenes...");

    // Query para obtener productos inactivos con sus categorías y marcas
    const productosQuery = `
      SELECT 
        p.id,
        p.nombre,
        p.descripcion,
        p.precio,
        p.stock,
        p.slug,
        p.activo,
        p.fecha_creacion,
        p.fecha_actualizacion,
        c.nombre as categoria_nombre,
        c.id as categoria_id,
        m.nombre as marca_nombre,
        m.id as marca_id
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN marcas m ON p.marca_id = m.id
      WHERE p.activo = FALSE
      ORDER BY p.fecha_actualizacion DESC
    `;

    const [productos] = await pool.execute(productosQuery);

    // Para cada producto, obtener sus imágenes
    for (let producto of productos) {
      const imagenesQuery = `
        SELECT id, image_url, public_id, fecha_creacion
        FROM imagenes_productos 
        WHERE producto_id = ?
        ORDER BY fecha_creacion ASC
      `;

      const [imagenes] = await pool.execute(imagenesQuery, [producto.id]);
      producto.imagenes = imagenes;
    }

    res.json({
      success: true,
      message: `${productos.length} productos inactivos encontrados`,
      data: productos,
    });

    console.log(
      `Respuesta enviada: ${productos.length} productos inactivos con imágenes`
    );
  } catch (err) {
    console.error("Error obteniendo productos inactivos:", err);
    res.status(500).json({
      success: false,
      error: err.message,
      message: "Error al obtener los productos inactivos",
    });
  }
};

// Controlador: obtener un producto específico por ID con sus imágenes
exports.getProductoById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "ID de producto inválido",
      });
    }

    console.log(`Obteniendo producto ID: ${id} con imágenes...`);

    // Query para obtener el producto específico (sin filtrar por activo)
    // Esto permite ver productos tanto activos como inactivos en el panel de administración
    const productoQuery = `
      SELECT 
        p.id,
        p.nombre,
        p.descripcion,
        p.precio,
        p.stock,
        p.slug,
        p.activo,
        p.fecha_creacion,
        p.fecha_actualizacion,
        c.nombre as categoria_nombre,
        c.id as categoria_id,
        c.descripcion as categoria_descripcion,
        m.nombre as marca_nombre,
        m.id as marca_id,
        m.descripcion as marca_descripcion
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN marcas m ON p.marca_id = m.id
      WHERE p.id = ?
    `;

    const [productos] = await pool.execute(productoQuery, [id]);

    if (productos.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    const producto = productos[0];

    // Obtener las imágenes del producto
    const imagenesQuery = `
      SELECT id, image_url, public_id, fecha_creacion
      FROM imagenes_productos 
      WHERE producto_id = ?
      ORDER BY fecha_creacion ASC
    `;

    const [imagenes] = await pool.execute(imagenesQuery, [id]);
    producto.imagenes = imagenes;

    res.json({
      success: true,
      message: `Producto encontrado${producto.activo ? "" : " (inactivo)"}`,
      data: producto,
    });

    console.log(
      `Producto ${id} encontrado con ${imagenes.length} imágenes${
        producto.activo ? "" : " (inactivo)"
      }`
    );
  } catch (err) {
    console.error("Error obteniendo producto por ID:", err);
    res.status(500).json({
      success: false,
      error: err.message,
      message: "Error al obtener el producto",
    });
  }
};

// Controlador: obtener solo las imágenes de un producto
exports.getImagenesProducto = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "ID de producto inválido",
      });
    }

    console.log(`Obteniendo imágenes del producto ID: ${id}...`);

    // Verificar que el producto existe (SIN filtrar por activo)
    // Esto permite obtener imágenes de productos tanto activos como inactivos
    const [producto] = await pool.execute(
      "SELECT id, nombre, activo FROM productos WHERE id = ?",
      [id]
    );

    if (producto.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    // Obtener las imágenes
    const imagenesQuery = `
      SELECT id, image_url, public_id, fecha_creacion
      FROM imagenes_productos 
      WHERE producto_id = ?
      ORDER BY fecha_creacion ASC
    `;

    const [imagenes] = await pool.execute(imagenesQuery, [id]);

    res.json({
      success: true,
      message: `${imagenes.length} imágenes encontradas para el producto "${
        producto[0].nombre
      }"${producto[0].activo ? "" : " (inactivo)"}`,
      data: {
        producto_id: id,
        producto_nombre: producto[0].nombre,
        producto_activo: producto[0].activo, // Incluir estado del producto
        imagenes: imagenes,
      },
    });

    console.log(
      `${imagenes.length} imágenes encontradas para producto ${id}${
        producto[0].activo ? "" : " (inactivo)"
      }`
    );
  } catch (err) {
    console.error("Error obteniendo imágenes del producto:", err);
    res.status(500).json({
      success: false,
      error: err.message,
      message: "Error al obtener las imágenes del producto",
    });
  }
};

// ============================================
// CONTROLADORES PARA EDITAR Y ELIMINAR
// ============================================

// Helper: eliminar imagen de Cloudinary
async function eliminarImagenCloudinary(public_id) {
  try {
    const result = await cloudinary.uploader.destroy(public_id);
    console.log(`Imagen eliminada de Cloudinary: ${public_id}`, result);
    return result;
  } catch (error) {
    console.error(`Error eliminando imagen de Cloudinary: ${public_id}`, error);
    throw error;
  }
}

// Controlador: actualizar producto (información y/o imágenes)
exports.updateProducto = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "ID de producto inválido",
      });
    }

    console.log(`Actualizando producto ID: ${id}`);

    // Extraer datos del producto desde req.body
    const {
      nombre,
      descripcion,
      precio,
      stock,
      categoria_id,
      marca_id,
      imagenes_a_eliminar, // Array de IDs de imágenes a eliminar
    } = req.body;

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Verificar que el producto existe
      const [productoExistente] = await connection.execute(
        "SELECT * FROM productos WHERE id = ? AND activo = TRUE",
        [id]
      );

      if (productoExistente.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({
          success: false,
          message: "Producto no encontrado",
        });
      }

      // Actualizar información del producto si se proporcionó
      if (
        nombre ||
        descripcion ||
        precio !== undefined ||
        stock !== undefined ||
        categoria_id !== undefined ||
        marca_id !== undefined
      ) {
        let updateFields = [];
        let updateValues = [];

        if (nombre) {
          updateFields.push("nombre = ?");
          updateValues.push(nombre);

          // Actualizar slug si cambia el nombre
          const slug = nombre
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .substring(0, 150);
          updateFields.push("slug = ?");
          updateValues.push(slug);
        }

        if (descripcion !== undefined) {
          updateFields.push("descripcion = ?");
          updateValues.push(descripcion);
        }

        if (precio !== undefined) {
          updateFields.push("precio = ?");
          updateValues.push(precio);
        }

        if (stock !== undefined) {
          updateFields.push("stock = ?");
          updateValues.push(stock);
        }

        if (categoria_id !== undefined) {
          updateFields.push("categoria_id = ?");
          updateValues.push(categoria_id);
        }

        if (marca_id !== undefined) {
          updateFields.push("marca_id = ?");
          updateValues.push(marca_id);
        }

        if (updateFields.length > 0) {
          updateFields.push("fecha_actualizacion = CURRENT_TIMESTAMP");
          updateValues.push(id);

          const updateQuery = `UPDATE productos SET ${updateFields.join(
            ", "
          )} WHERE id = ?`;
          await connection.execute(updateQuery, updateValues);
          console.log(`Información del producto ${id} actualizada`);
        }
      }

      // Eliminar imágenes antiguas si se especificaron
      if (
        imagenes_a_eliminar &&
        Array.isArray(imagenes_a_eliminar) &&
        imagenes_a_eliminar.length > 0
      ) {
        console.log(
          `Eliminando ${imagenes_a_eliminar.length} imágenes antiguas...`
        );

        for (const imagen_id of imagenes_a_eliminar) {
          // Obtener el public_id de la imagen
          const [imagen] = await connection.execute(
            "SELECT public_id FROM imagenes_productos WHERE id = ? AND producto_id = ?",
            [imagen_id, id]
          );

          if (imagen.length > 0) {
            // Eliminar de Cloudinary
            try {
              await eliminarImagenCloudinary(imagen[0].public_id);
            } catch (error) {
              console.error(
                `Error eliminando imagen ${imagen_id} de Cloudinary:`,
                error
              );
              // Continuar aunque falle la eliminación de Cloudinary
            }

            // Eliminar de la base de datos
            await connection.execute(
              "DELETE FROM imagenes_productos WHERE id = ? AND producto_id = ?",
              [imagen_id, id]
            );
            console.log(`Imagen ${imagen_id} eliminada de DB y Cloudinary`);
          }
        }
      }

      // Agregar nuevas imágenes si se enviaron
      const resultadosImagenes = [];
      const erroresImagenes = [];

      if (req.files && req.files.length > 0) {
        console.log(`Agregando ${req.files.length} nuevas imágenes...`);

        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];

          try {
            console.log(`Procesando nueva imagen: ${file.originalname}`);

            // Subir a Cloudinary
            const cloudRes = await uploadBufferToCloudinary(
              file.buffer,
              "catalogo/productos"
            );

            console.log(`Imagen subida a Cloudinary: ${cloudRes.secure_url}`);

            // Guardar en tabla imagenes_productos
            const [imagenResult] = await connection.execute(
              "INSERT INTO imagenes_productos (producto_id, image_url, public_id) VALUES (?, ?, ?)",
              [id, cloudRes.secure_url, cloudRes.public_id]
            );

            console.log(
              `Imagen guardada en DB con ID: ${imagenResult.insertId}`
            );

            resultadosImagenes.push({
              imagen_id: imagenResult.insertId,
              url: cloudRes.secure_url,
              public_id: cloudRes.public_id,
              original_name: file.originalname,
            });
          } catch (error) {
            console.error(
              `Error procesando nueva imagen ${i + 1}:`,
              error.message
            );
            erroresImagenes.push({
              index: i + 1,
              original_name: file.originalname,
              error: error.message,
            });
          }
        }
      }

      await connection.commit();
      console.log("Transacción confirmada - producto actualizado");

      // Obtener producto actualizado
      const [productoActualizado] = await connection.execute(
        `SELECT 
          p.*,
          c.nombre as categoria_nombre,
          m.nombre as marca_nombre
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        LEFT JOIN marcas m ON p.marca_id = m.id
        WHERE p.id = ?`,
        [id]
      );

      // Obtener todas las imágenes actuales
      const [imagenesActuales] = await connection.execute(
        "SELECT id, image_url, public_id, fecha_creacion FROM imagenes_productos WHERE producto_id = ? ORDER BY fecha_creacion ASC",
        [id]
      );

      res.json({
        success: true,
        message: "Producto actualizado exitosamente",
        data: {
          producto: productoActualizado[0],
          imagenes: imagenesActuales,
          imagenes_nuevas: {
            exitosas: resultadosImagenes,
            errores: erroresImagenes,
            total_agregadas: resultadosImagenes.length,
          },
        },
      });

      console.log(`Producto ${id} actualizado exitosamente`);
    } catch (dbError) {
      await connection.rollback();
      throw dbError;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("Error actualizando producto:", err);
    res.status(500).json({
      success: false,
      error: err.message,
      message: "Error al actualizar el producto",
    });
  }
};

// Controlador: eliminar producto (soft delete)
exports.deleteProducto = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "ID de producto inválido",
      });
    }

    console.log(`Eliminando producto ID: ${id}`);

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Verificar que el producto existe
      const [productoExistente] = await connection.execute(
        "SELECT id, nombre FROM productos WHERE id = ? AND activo = TRUE",
        [id]
      );

      if (productoExistente.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({
          success: false,
          message: "Producto no encontrado",
        });
      }

      // Realizar soft delete (marcar como inactivo)
      await connection.execute(
        "UPDATE productos SET activo = FALSE, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?",
        [id]
      );

      await connection.commit();
      console.log(`Producto ${id} marcado como inactivo (soft delete)`);

      res.json({
        success: true,
        message: `Producto "${productoExistente[0].nombre}" eliminado exitosamente`,
        data: {
          producto_id: id,
          producto_nombre: productoExistente[0].nombre,
        },
      });
    } catch (dbError) {
      await connection.rollback();
      throw dbError;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("Error eliminando producto:", err);
    res.status(500).json({
      success: false,
      error: err.message,
      message: "Error al eliminar el producto",
    });
  }
};

// Controlador: eliminar producto permanentemente (hard delete)
exports.deleteProductoPermanente = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "ID de producto inválido",
      });
    }

    console.log(`Eliminando producto ID: ${id} PERMANENTEMENTE`);

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Verificar que el producto existe
      const [productoExistente] = await connection.execute(
        "SELECT id, nombre FROM productos WHERE id = ?",
        [id]
      );

      if (productoExistente.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({
          success: false,
          message: "Producto no encontrado",
        });
      }

      // Obtener todas las imágenes del producto
      const [imagenes] = await connection.execute(
        "SELECT id, public_id FROM imagenes_productos WHERE producto_id = ?",
        [id]
      );

      // Eliminar imágenes de Cloudinary
      const erroresCloudinary = [];
      for (const imagen of imagenes) {
        try {
          await eliminarImagenCloudinary(imagen.public_id);
          console.log(`Imagen ${imagen.id} eliminada de Cloudinary`);
        } catch (error) {
          console.error(
            `Error eliminando imagen ${imagen.id} de Cloudinary:`,
            error
          );
          erroresCloudinary.push({
            imagen_id: imagen.id,
            public_id: imagen.public_id,
            error: error.message,
          });
        }
      }

      // Eliminar imágenes de la base de datos
      await connection.execute(
        "DELETE FROM imagenes_productos WHERE producto_id = ?",
        [id]
      );
      console.log(`${imagenes.length} imágenes eliminadas de la base de datos`);

      // Eliminar producto de la base de datos
      await connection.execute("DELETE FROM productos WHERE id = ?", [id]);
      console.log(
        `Producto ${id} eliminado permanentemente de la base de datos`
      );

      await connection.commit();

      res.json({
        success: true,
        message: `Producto "${productoExistente[0].nombre}" eliminado permanentemente`,
        data: {
          producto_id: id,
          producto_nombre: productoExistente[0].nombre,
          imagenes_eliminadas: imagenes.length,
          errores_cloudinary:
            erroresCloudinary.length > 0 ? erroresCloudinary : undefined,
        },
      });
    } catch (dbError) {
      await connection.rollback();
      throw dbError;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("Error eliminando producto permanentemente:", err);
    res.status(500).json({
      success: false,
      error: err.message,
      message: "Error al eliminar el producto permanentemente",
    });
  }
};

// Controlador: reactivar producto (cambiar activo de FALSE a TRUE)
exports.reactivarProducto = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "ID de producto inválido",
      });
    }

    console.log(`Reactivando producto ID: ${id}`);

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Verificar que el producto existe y está inactivo
      const [productoExistente] = await connection.execute(
        "SELECT id, nombre, activo FROM productos WHERE id = ?",
        [id]
      );

      if (productoExistente.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({
          success: false,
          message: "Producto no encontrado",
        });
      }

      // Verificar si ya está activo
      if (
        productoExistente[0].activo === 1 ||
        productoExistente[0].activo === true
      ) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: "El producto ya está activo",
        });
      }

      // Reactivar el producto (marcar como activo)
      await connection.execute(
        "UPDATE productos SET activo = TRUE, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?",
        [id]
      );

      await connection.commit();
      console.log(`Producto ${id} reactivado exitosamente`);

      // Obtener el producto actualizado con sus imágenes
      const [productoActualizado] = await connection.execute(
        `SELECT 
          p.*,
          c.nombre as categoria_nombre,
          m.nombre as marca_nombre
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        LEFT JOIN marcas m ON p.marca_id = m.id
        WHERE p.id = ?`,
        [id]
      );

      // Obtener las imágenes del producto
      const [imagenes] = await connection.execute(
        "SELECT id, image_url, public_id, fecha_creacion FROM imagenes_productos WHERE producto_id = ? ORDER BY fecha_creacion ASC",
        [id]
      );

      res.json({
        success: true,
        message: `Producto "${productoExistente[0].nombre}" reactivado exitosamente`,
        data: {
          producto: productoActualizado[0],
          imagenes: imagenes,
        },
      });
    } catch (dbError) {
      await connection.rollback();
      throw dbError;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("Error reactivando producto:", err);
    res.status(500).json({
      success: false,
      error: err.message,
      message: "Error al reactivar el producto",
    });
  }
};
