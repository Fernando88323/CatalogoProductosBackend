const pool = require("../../database/config");

// Obtener todas las marcas
const getMarcas = async (req, res) => {
  try {
    const marcas = await pool.query("SELECT * FROM marcas");
    res.json({
      message: "Marcas obtenidas con éxito",
      marcas: marcas.rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getMarcas,
};
