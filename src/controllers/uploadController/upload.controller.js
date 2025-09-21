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
