const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary.js");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "productos", // carpeta en Cloudinary
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    public_id: (req, file) => {
      // Generar un nombre único para el archivo
      const timestamp = Date.now();
      const originalName = file.originalname.split('.')[0];
      return `${originalName}_${timestamp}`;
    },
    transformation: [
      { width: 800, height: 600, crop: "limit" }, // Optimizar tamaño
      { quality: "auto" }, // Calidad automática
      { fetch_format: "auto" } // Formato automático
    ]
  },
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // límite de 5MB por archivo
  },
  fileFilter: (req, file, cb) => {
    // Verificar que sea una imagen
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

module.exports = upload;
