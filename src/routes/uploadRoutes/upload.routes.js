// routes/uploadRoutes.js
const express = require("express");
const multer = require("multer");
const {
  uploadImage,
} = require("../../controllers/uploadController/upload.controller");

const router = express.Router();
// Usar memoryStorage para recibir la imagen en el backend y procesarla
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // límite de 5MB por archivo
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

router.post("/upload", upload.single("image"), uploadImage);

module.exports = router;
