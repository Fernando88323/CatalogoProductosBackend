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

// controlador: recibir imagen, procesarla, subirla a cloudinary y guardar en DB
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    console.log("1. Imagen recibida desde frontend:", req.file.originalname);

    // 2. Procesar y subir a Cloudinary
    console.log("2. Procesando y subiendo a Cloudinary...");
    const cloudRes = await uploadBufferToCloudinary(
      req.file.buffer,
      "catalogo/productos"
    );
    console.log("3. Imagen subida a Cloudinary:", cloudRes.secure_url);

    // 4. Guardar URL en base de datos
    const nombre = req.body.nombre || null;
    console.log("4. Guardando en base de datos...");
    const [dbResult] = await pool.execute(
      "INSERT INTO productos (nombre, image_url, public_id) VALUES (?, ?, ?)",
      [nombre, cloudRes.secure_url, cloudRes.public_id]
    );
    console.log("5. Guardado en DB con ID:", dbResult.insertId);

    // 6. Responder al frontend con la URL de Cloudinary
    res.json({
      success: true,
      message: "Imagen subida y guardada exitosamente",
      data: {
        id: dbResult.insertId,
        url: cloudRes.secure_url,
        public_id: cloudRes.public_id,
        nombre: nombre,
      },
    });
    console.log("6. Respuesta enviada al frontend");
  } catch (err) {
    console.error("Error en el proceso:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
