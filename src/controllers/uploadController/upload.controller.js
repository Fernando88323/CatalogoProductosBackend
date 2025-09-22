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

// Controlador: obtener todos los productos con sus imágenes
exports.getProductos = async (req, res) => {
  try {
    console.log("Obteniendo todos los productos con imágenes...");

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
      message: `${productos.length} productos encontrados`,
      data: productos,
    });

    console.log(
      `Respuesta enviada: ${productos.length} productos con imágenes`
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

    // Query para obtener el producto específico
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
      WHERE p.id = ? AND p.activo = TRUE
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
      message: "Producto encontrado",
      data: producto,
    });

    console.log(`Producto ${id} encontrado con ${imagenes.length} imágenes`);
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

    // Verificar que el producto existe
    const [producto] = await pool.execute(
      "SELECT id, nombre FROM productos WHERE id = ? AND activo = TRUE",
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
      message: `${imagenes.length} imágenes encontradas para el producto "${producto[0].nombre}"`,
      data: {
        producto_id: id,
        producto_nombre: producto[0].nombre,
        imagenes: imagenes,
      },
    });

    console.log(`${imagenes.length} imágenes encontradas para producto ${id}`);
  } catch (err) {
    console.error("Error obteniendo imágenes del producto:", err);
    res.status(500).json({
      success: false,
      error: err.message,
      message: "Error al obtener las imágenes del producto",
    });
  }
};
