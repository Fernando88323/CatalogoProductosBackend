// controllers/userController.js
const bcrypt = require("bcrypt");
const db = require("../../database/config"); // tu conexión a MySQL
const { generateToken } = require("../../utils/jwt");

// Crear un usuario
const createUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Todos los campos son obligatorios" });
    }

    // Hashear la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insertar en la base de datos usando async/await
    const query = "INSERT INTO usuarios (email, password) VALUES (?, ?)";
    const [result] = await db.query(query, [email, hashedPassword]);

    res.status(201).json({
      message: "Usuario creado correctamente",
      userId: result.insertId,
    });
  } catch (error) {
    console.error("Error en createUser:", error);

    // Manejo específico de errores
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "El usuario o email ya existe" });
    }

    res.status(500).json({
      message: "Error al crear usuario",
      error: error.message,
    });
  }
};

// Login de usuario
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Intento de login:", { email }); // Log (sin mostrar password)

    // Validar que vengan los datos
    if (!email || !password) {
      return res.status(400).json({
        message: "Email y contraseña son obligatorios",
      });
    }

    // Buscar usuario por email
    const query = "SELECT * FROM usuarios WHERE email = ?";
    const [rows] = await db.query(query, [email]);

    // Verificar si existe el usuario
    if (rows.length === 0) {
      return res.status(401).json({
        message: "Credenciales incorrectas",
      });
    }

    const user = rows[0];

    // Comparar contraseña con bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Credenciales incorrectas",
      });
    }

    // Login exitoso - no enviar la contraseña al cliente
    const { password: _, ...userWithoutPassword } = user;

    // Generar JWT token
    const accessToken = generateToken(user.id, user.email);

    console.log("Login exitoso para usuario:", email); // Log

    // Establecer el token como cookie HTTP-only
    res.cookie("accessToken", accessToken, {
      httpOnly: true, // No accesible desde JavaScript del cliente
      secure: process.env.NODE_ENV === "production", // Solo HTTPS en producción
      sameSite: "lax", // Protección CSRF (lax permite navegación entre sitios)
      maxAge: 3 * 60 * 60 * 1000, // 3 horas (igual que el token)
    });

    res.status(200).json({
      success: true,
      message: "Login exitoso",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Error en loginUser:", error);
    res.status(500).json({
      message: "Error al iniciar sesión",
      error: error.message,
    });
  }
};

// Obtener perfil del usuario autenticado (requiere JWT)
const getUserProfile = async (req, res) => {
  try {
    // El usuario viene del middleware de autenticación
    const userId = req.user.id;

    const query = "SELECT id, email FROM usuarios WHERE id = ?";
    const [rows] = await db.query(query, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Usuario no encontrado",
      });
    }

    res.status(200).json({
      user: rows[0],
    });
  } catch (error) {
    console.error("Error en getUserProfile:", error);
    res.status(500).json({
      message: "Error al obtener perfil",
      error: error.message,
    });
  }
};

// Logout de usuario
const logoutUser = async (req, res) => {
  try {
    // Si estás usando cookies, limpiarlas
    res.clearCookie("accessToken");

    res.status(200).json({
      message: "Logout exitoso",
      success: true,
    });
  } catch (error) {
    console.error("Error en logoutUser:", error);
    res.status(500).json({
      message: "Error al cerrar sesión",
      error: error.message,
    });
  }
};

// Verificar sesión activa (para el frontend al cargar la página)
const verifySession = async (req, res) => {
  try {
    // El usuario viene del middleware de autenticación (req.user)
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Opcionalmente, verificar que el usuario aún existe en la BD
    const query = "SELECT id, email, created_at FROM usuarios WHERE id = ?";
    const [rows] = await db.query(query, [userId]);

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    const { password: _, ...userWithoutPassword } = rows[0];

    res.status(200).json({
      success: true,
      message: "Sesión válida",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Error en verifySession:", error);
    res.status(500).json({
      success: false,
      message: "Error al verificar sesión",
      error: error.message,
    });
  }
};

module.exports = {
  createUser,
  loginUser,
  getUserProfile,
  logoutUser,
  verifySession,
};
