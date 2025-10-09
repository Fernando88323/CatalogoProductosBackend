// utils/jwt/jwt.js
const { sign, verify } = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const generateToken = (userId, email) => {
  const accessToken = sign(
    {
      id: userId,
      email: email,
    },
    JWT_SECRET,
    {
      expiresIn: "3h", // Token válido por 3 horas
      algorithm: "HS256",
    }
  );
  return accessToken;
};

const verifyToken = (accessToken) => {
  try {
    return verify(accessToken, JWT_SECRET);
  } catch (err) {
    throw err;
  }
};

module.exports = {
  generateToken,
  verifyToken,
};
