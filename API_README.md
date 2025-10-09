# 🚀 API Catálogo de Productos - Backend

Backend para gestión de catálogo de productos con autenticación, carga de imágenes y gestión de marcas.

## 🌐 URL de Producción

```
https://catalogoproductosbackend-production-fcd1.up.railway.app
```

## 📋 Endpoints Disponibles

### 🏠 Información General

#### `GET /`

Información general de la API y endpoints disponibles.

**Respuesta:**

```json
{
  "message": "🚀 API Catálogo de Productos - Backend",
  "version": "1.0.0",
  "status": "online",
  "timestamp": "2025-10-09T...",
  "endpoints": {
    "health": "/health",
    "auth": "/auth/login",
    "marcas": "/marcas",
    "upload": "/upload"
  }
}
```

#### `GET /health`

Verificar el estado del servidor.

**Respuesta:**

```json
{
  "status": "ok",
  "message": "Server is running",
  "timestamp": "2025-10-09T...",
  "env": "production"
}
```

---

### 🔐 Autenticación

#### `POST /auth/login`

Iniciar sesión y obtener token JWT.

**Body:**

```json
{
  "username": "usuario",
  "password": "contraseña"
}
```

**Respuesta exitosa:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "usuario"
  }
}
```

---

### 🏷️ Marcas

#### `GET /marcas`

Obtener todas las marcas.

**Headers:**

```
Authorization: Bearer <token>
```

**Respuesta:**

```json
[
  {
    "id": 1,
    "nombre": "Marca 1",
    "descripcion": "Descripción de la marca",
    "logo_url": "https://cloudinary.com/..."
  }
]
```

#### `GET /marcas/:id`

Obtener una marca específica.

#### `POST /marcas`

Crear una nueva marca.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**

```json
{
  "nombre": "Nueva Marca",
  "descripcion": "Descripción",
  "logo_url": "https://..."
}
```

#### `PUT /marcas/:id`

Actualizar una marca existente.

#### `DELETE /marcas/:id`

Eliminar una marca.

---

### 📤 Upload (Cloudinary)

#### `POST /upload`

Subir una imagen a Cloudinary.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (form-data):**

```
file: <archivo de imagen>
```

**Respuesta:**

```json
{
  "url": "https://res.cloudinary.com/...",
  "public_id": "...",
  "secure_url": "https://..."
}
```

---

## 🔧 Configuración Local

### Requisitos

- Node.js >= 14.0.0
- MySQL
- Cuenta de Cloudinary

### Instalación

1. **Clonar el repositorio:**

```bash
git clone https://github.com/Fernando88323/CatalogoProductosBackend.git
cd CatalogoProductosBackend
```

2. **Instalar dependencias:**

```bash
npm install
# o
pnpm install
```

3. **Configurar variables de entorno:**

Crea un archivo `.env` basado en `.env.example`:

```bash
NODE_ENV=development
PORT=8080
HOST=localhost
USER=root
DB_PORT=3306
PSW=tu_password
DB=tu_database
CLOUD_NAME=tu_cloud_name
API_KEY=tu_api_key
API_SECRET=tu_api_secret
JWT_SECRET=tu_secreto_seguro_minimo_32_caracteres
ALLOWED_ORIGINS=http://localhost:5173
```

4. **Validar configuración:**

```bash
node validate-env.js
```

5. **Iniciar el servidor:**

```bash
# Modo desarrollo (con nodemon)
npm run dev

# Modo producción
npm start
```

El servidor estará disponible en: `http://localhost:8080`

---

## 🧪 Pruebas

### Verificar que el servidor funciona:

```bash
curl http://localhost:8080/health
```

### Probar el endpoint raíz:

```bash
curl http://localhost:8080/
```

### Login de ejemplo:

```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"usuario","password":"password"}'
```

---

## 📦 Estructura del Proyecto

```
catalogoProductosBackend/
├── index.js                 # Punto de entrada principal
├── package.json            # Dependencias y scripts
├── .env                    # Variables de entorno (no en git)
├── .env.example           # Ejemplo de variables de entorno
├── validate-env.js        # Script de validación de .env
├── Procfile               # Configuración para Railway
├── src/
│   ├── config/
│   │   └── cloudinary.js  # Configuración de Cloudinary
│   ├── controllers/
│   │   ├── login/         # Controladores de autenticación
│   │   ├── marcas/        # Controladores de marcas
│   │   └── uploadController/
│   ├── database/
│   │   └── config.js      # Configuración de MySQL
│   ├── middlewares/
│   │   ├── auth.js        # Middleware de autenticación
│   │   └── upload.js      # Middleware de carga de archivos
│   ├── routes/
│   │   ├── index.js       # Rutas principales
│   │   ├── login/         # Rutas de autenticación
│   │   ├── marcas/        # Rutas de marcas
│   │   └── uploadRoutes/  # Rutas de upload
│   └── utils/
│       └── jwt.js         # Utilidades JWT
└── docs/
    ├── DEPLOY.md          # Guía de despliegue
    ├── RAILWAY_FIX.md     # Solución de problemas Railway
    ├── RAILWAY_SETUP.md   # Configuración Railway
    ├── ERRORES_COMUNES.md # Errores comunes y soluciones
    └── SOLUCION_RAILWAY.md # Resumen de soluciones
```

---

## 🚀 Despliegue a Producción

### Railway

Ver guías detalladas:

- **[RAILWAY_SETUP.md](RAILWAY_SETUP.md)** - Guía completa paso a paso
- **[RAILWAY_FIX.md](RAILWAY_FIX.md)** - Solución rápida de problemas
- **[DEPLOY.md](DEPLOY.md)** - Información general de despliegue

**Pasos rápidos:**

1. Configurar variables de entorno en Railway Dashboard
2. Conectar el repositorio de GitHub
3. Railway desplegará automáticamente

**Variables requeridas en Railway:**

```
NODE_ENV=production
PORT=8080
HOST=<mysql-host-de-railway>
USER=<mysql-user-de-railway>
DB_PORT=<mysql-port-de-railway>
PSW=<mysql-password-de-railway>
DB=railway
CLOUD_NAME=<tu-cloudinary-name>
API_KEY=<tu-cloudinary-key>
API_SECRET=<tu-cloudinary-secret>
JWT_SECRET=<tu-secreto-seguro>
ALLOWED_ORIGINS=<url-de-tu-frontend>
```

---

## 🛠️ Tecnologías

- **Node.js** - Runtime
- **Express** - Framework web
- **MySQL** - Base de datos
- **Cloudinary** - Almacenamiento de imágenes
- **JWT** - Autenticación
- **bcrypt** - Encriptación de contraseñas
- **dotenv** - Variables de entorno
- **multer** - Carga de archivos
- **cors** - Cross-Origin Resource Sharing

---

## 📝 Scripts Disponibles

```bash
# Desarrollo con auto-reload
npm run dev

# Producción
npm start

# Validar archivo .env
npm run validate
# o
node validate-env.js
```

---

## 🐛 Solución de Problemas

Ver **[ERRORES_COMUNES.md](ERRORES_COMUNES.md)** para una lista completa de errores comunes y sus soluciones.

### Problemas frecuentes:

1. **Error de conexión a BD:** Verifica las credenciales en `.env`
2. **Error de PORT:** Asegúrate de que `PORT` sea un número
3. **Error de CORS:** Verifica `ALLOWED_ORIGINS`
4. **Módulos no encontrados:** Ejecuta `npm install`

---

## 📄 Licencia

ISC

---

## 👨‍💻 Autor

Fernando88323

---

## 🔗 Enlaces

- **Repositorio:** https://github.com/Fernando88323/CatalogoProductosBackend
- **Producción:** https://catalogoproductosbackend-production-fcd1.up.railway.app
- **Documentación Railway:** [RAILWAY_SETUP.md](RAILWAY_SETUP.md)

---

## 📊 Estado

![Status](https://img.shields.io/badge/status-online-brightgreen)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-green)

**Última actualización:** Octubre 2025
