// routes/uploadRoutes.js
const express = require("express");
const multer = require("multer");
const {
  uploadImage,
} = require("../../controllers/uploadController/upload.controller");

const router = express.Router();
// Usar memoryStorage para recibir las imágenes en el backend y procesarlas
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // límite de 5MB por archivo
    files: 10, // máximo 10 archivos por petición
  },
  fileFilter: (req, file, cb) => {
    // Verificar que sea una imagen
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos de imagen"), false);
    }
  },
});

// Ruta para subir múltiples imágenes
router.post("/upload", upload.array("images", 10), uploadImage); // máximo 10 imágenes

module.exports = router;
