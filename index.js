require("dotenv").config();
require("./src/database/config");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const app = express();

// Middlewares - en orden correcto
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requests sin origin (como mobile apps o curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = "El origen del request no está permitido por CORS.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true, // Permitir el envio de cookies y autenticacion
    allowedHeaders: ["Authorization", "Content-Type"], // Permitir headers necesarios
  })
);

app.use(cookieParser()); // Parse cookies
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Ruta principal
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
app.set("puerto", process.env.PORT || 4001);
app.listen(app.get("puerto"), () => {
  console.log("Corriendo en el puerto:", app.get("puerto"));
});
