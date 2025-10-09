const express = require("express");
const {
  createUser,
  loginUser,
  getUserProfile,
  logoutUser,
  verifySession,
} = require("../../controllers/login/login.controller");
const validateTokenMiddleware = require("../../middlewares/auth");

const router = express.Router();

// Rutas públicas
router.post("/register", createUser);
router.post("/login", loginUser);

// Rutas protegidas (requieren JWT)
router.get("/verify", validateTokenMiddleware, verifySession);
router.get("/profile", validateTokenMiddleware, getUserProfile);
router.post("/logout", validateTokenMiddleware, logoutUser);

module.exports = router;
