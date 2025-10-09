#!/usr/bin/env node

/**
 * Script para validar el archivo .env
 * Ejecuta: node validate-env.js
 */

require("dotenv").config();

console.log("🔍 Validando archivo .env...\n");

let hasErrors = false;
let hasWarnings = false;

// Variables requeridas
const requiredVars = {
  NODE_ENV: { type: "string", values: ["development", "production"] },
  PORT: { type: "number", min: 1, max: 65535 },
  HOST: { type: "string" },
  USER: { type: "string" },
  DB_PORT: { type: "number", min: 1, max: 65535 },
  PSW: { type: "string" },
  DB: { type: "string" },
  CLOUD_NAME: { type: "string" },
  API_KEY: { type: "string" },
  API_SECRET: { type: "string" },
  JWT_SECRET: { type: "string", minLength: 16 },
  ALLOWED_ORIGINS: { type: "string" },
};

// Validar cada variable
for (const [varName, config] of Object.entries(requiredVars)) {
  const value = process.env[varName];

  // Verificar si existe
  if (!value) {
    console.error(`❌ ${varName}: NO CONFIGURADO`);
    hasErrors = true;
    continue;
  }

  // Validar tipo number
  if (config.type === "number") {
    const numValue = parseInt(value);
    if (isNaN(numValue)) {
      console.error(
        `❌ ${varName}: Debe ser un número (valor actual: "${value}")`
      );
      hasErrors = true;
      continue;
    }
    if (config.min && numValue < config.min) {
      console.error(
        `❌ ${varName}: Debe ser mayor o igual a ${config.min} (valor actual: ${numValue})`
      );
      hasErrors = true;
      continue;
    }
    if (config.max && numValue > config.max) {
      console.error(
        `❌ ${varName}: Debe ser menor o igual a ${config.max} (valor actual: ${numValue})`
      );
      hasErrors = true;
      continue;
    }
  }

  // Validar valores permitidos
  if (config.values && !config.values.includes(value)) {
    console.error(
      `❌ ${varName}: Debe ser uno de: ${config.values.join(
        ", "
      )} (valor actual: "${value}")`
    );
    hasErrors = true;
    continue;
  }

  // Validar longitud mínima
  if (config.minLength && value.length < config.minLength) {
    console.warn(
      `⚠️  ${varName}: Se recomienda al menos ${config.minLength} caracteres (actual: ${value.length})`
    );
    hasWarnings = true;
  }

  // Todo OK
  console.log(`✅ ${varName}: OK`);
}

// Validaciones adicionales
console.log("\n🔍 Validaciones adicionales:\n");

// Validar formato de ALLOWED_ORIGINS
const origins = process.env.ALLOWED_ORIGINS;
if (origins) {
  const originList = origins.split(",");
  let validOrigins = true;

  originList.forEach((origin) => {
    const trimmed = origin.trim();
    if (trimmed !== origin) {
      console.warn(
        `⚠️  ALLOWED_ORIGINS: Contiene espacios extras alrededor de "${origin}"`
      );
      hasWarnings = true;
    }
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      console.error(
        `❌ ALLOWED_ORIGINS: "${trimmed}" debe empezar con http:// o https://`
      );
      validOrigins = false;
      hasErrors = true;
    }
    if (trimmed.endsWith("/")) {
      console.warn(
        `⚠️  ALLOWED_ORIGINS: "${trimmed}" no debería terminar con /`
      );
      hasWarnings = true;
    }
  });

  if (validOrigins) {
    console.log(
      `✅ ALLOWED_ORIGINS: ${originList.length} origen(es) configurado(s)`
    );
  }
}

// Validar HOST de base de datos
const host = process.env.HOST;
if (host === "localhost" || host === "127.0.0.1") {
  console.log(`✅ HOST: Configurado para desarrollo local`);
} else {
  console.log(`✅ HOST: Configurado para servidor remoto`);
}

// Verificar si JWT_SECRET es seguro
const jwtSecret = process.env.JWT_SECRET;
if (jwtSecret) {
  if (jwtSecret.length < 32) {
    console.warn(
      `⚠️  JWT_SECRET: Se recomienda al menos 32 caracteres para producción (actual: ${jwtSecret.length})`
    );
    hasWarnings = true;
  }
  if (jwtSecret === "catalogoProductosSecret2025") {
    console.warn(
      `⚠️  JWT_SECRET: Estás usando el valor por defecto. Cámbialo en producción.`
    );
    hasWarnings = true;
  }
}

// Resumen
console.log("\n" + "=".repeat(50));
if (hasErrors) {
  console.error("❌ Hay errores en tu archivo .env");
  console.error("   Corrígelos antes de ejecutar la aplicación.\n");
  process.exit(1);
} else if (hasWarnings) {
  console.warn("⚠️  Tu archivo .env tiene algunas advertencias");
  console.warn("   La aplicación funcionará, pero considera corregirlas.\n");
  process.exit(0);
} else {
  console.log("✅ Tu archivo .env está configurado correctamente\n");
  process.exit(0);
}
