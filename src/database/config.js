const mysql = require("mysql2/promise");
require("dotenv").config();

// Configuración de la base de datos
// Railway proporciona DATABASE_URL, pero también soportamos variables individuales
const dbConfig = process.env.DATABASE_URL
  ? process.env.DATABASE_URL
  : {
      host: process.env.HOST,
      user: process.env.USER,
      port: process.env.DB_PORT,
      password: process.env.PSW,
      database: process.env.DB,
      multipleStatements: true,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    };

const pool = mysql.createPool(dbConfig);

// (Opcional) probar conexión al arrancar
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅ Conectado a la DB:", process.env.DB || "railway");
    console.log("🔧 Host:", process.env.HOST);
    console.log("🔧 Port:", process.env.DB_PORT);
    conn.release();
  } catch (err) {
    console.error("❌ Error de conexión a la DB:", err.message);
    console.error("🔍 Verificando variables de entorno...");
    console.error("   HOST:", process.env.HOST || "❌ NO CONFIGURADO");
    console.error("   USER:", process.env.USER || "❌ NO CONFIGURADO");
    console.error("   DB_PORT:", process.env.DB_PORT || "❌ NO CONFIGURADO");
    console.error("   DB:", process.env.DB || "❌ NO CONFIGURADO");
    console.error(
      "   DATABASE_URL:",
      process.env.DATABASE_URL ? "✅ CONFIGURADO" : "❌ NO CONFIGURADO"
    );

    if (process.env.NODE_ENV === "production") {
      console.error("⚠️  En producción: saliendo del proceso...");
      process.exit(1); // Salir en producción si no hay conexión
    }
  }
})();

module.exports = pool;
