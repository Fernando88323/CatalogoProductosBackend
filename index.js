require("dotenv").config();
require("./src/database/config");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const app = express();

// Middlewares - en orden correcto
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(origin => origin.trim())
  : ["http://localhost:5173"];

console.log("🔧 CORS configurado para:", allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requests sin origin (como mobile apps, curl, Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = `CORS: El origen ${origin} no está permitido. Orígenes permitidos: ${allowedOrigins.join(", ")}`;
        console.error(msg);
        return callback(new Error(msg), false);
      }
      console.log("✅ CORS: Origen permitido:", origin);
      return callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true, // Permitir el envio de cookies y autenticacion
    allowedHeaders: ["Authorization", "Content-Type"], // Permitir headers necesarios
  })
);

app.use(cookieParser()); // Parse cookies
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Rutas principales (incluye /, /health, /marcas, /auth, /upload)
app.use("/", require("./src/routes/index"));

// Para manejar rutas no definidas
app.use((req, res, next) => {
  res.status(404).json({
    message: "Endpoint no encontrado.",
  });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(err.status || 500).json({
    message: err.message || "Error interno del servidor",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Levantando el servidor
const PORT = parseInt(process.env.PORT) || 4001;
const HOST = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";

// Validar que PORT es un número válido
if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
  console.error("❌ ERROR: PORT debe ser un número entre 1 y 65535");
  console.error("   Valor actual:", process.env.PORT);
  console.error("   Usando puerto por defecto: 4001");
}

app.listen(PORT, HOST, () => {
  console.log("=".repeat(50));
  console.log(`🚀 Servidor corriendo en ${HOST}:${PORT}`);
  console.log(`📝 Modo: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Health check: http://${HOST}:${PORT}/health`);
  console.log("=".repeat(50));
});
