const jwt = require("jsonwebtoken");
require("dotenv").config();

const validateTokenMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;
    // Buscar el token primero en las cookies, luego en el header
    const token = req.cookies.accessToken || tokenFromHeader;

    // console.log("Token recibido en el backend:", token?.slice(0, 10) + "...");

    if (!token) {
      console.log("Acceso no autorizado, token requerido");
      return res
        .status(401)
        .json({ error: "Acceso no autorizado, token requerido" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          return res.status(401).json({ error: "La sesión ha expirado" });
        } else if (err.name === "JsonWebTokenError") {
          return res.status(401).json({
            error: "Token no válido. Por favor, vuelva a iniciar sesión!",
          });
        } else {
          return res.status(400).json({ error: "La sesión no es válida" });
        }
      }

      // Agregar información del usuario al request
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error("Error en la verificación del token:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

module.exports = validateTokenMiddleware;
