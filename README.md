# Catálogo de Productos - Backend

Backend para sistema de catálogo de productos con autenticación JWT, gestión de marcas y carga de imágenes con Cloudinary.

## 🚀 Tecnologías

- Node.js
- Express
- MySQL
- JWT (Autenticación)
- Cloudinary (Gestión de imágenes)
- bcrypt (Hash de contraseñas)

## 📋 Requisitos Previos

- Node.js (v14 o superior)
- MySQL
- Cuenta de Cloudinary
- pnpm (o npm)

## 🔧 Instalación

1. Clonar el repositorio:

```bash
git clone <url-del-repositorio>
cd catalogoProductosBackend
```

2. Instalar dependencias:

```bash
pnpm install
# o
npm install
```

3. Configurar variables de entorno:
   - Copiar el archivo `.env.example` a `.env`
   - Completar las variables con tus credenciales:

```bash
cp .env.example .env
```

4. Configurar la base de datos MySQL con las credenciales del archivo `.env`

## 🏃‍♂️ Ejecución

### Desarrollo

```bash
pnpm dev
# o
npm run dev
```

### Producción

```bash
pnpm start
# o
npm start
```

El servidor se ejecutará por defecto en `http://localhost:4000` (o el puerto configurado en `.env`)

## 📁 Estructura del Proyecto

```
.
├── src/
│   ├── config/          # Configuraciones (Cloudinary, etc.)
│   ├── controllers/     # Controladores de rutas
│   ├── database/        # Configuración de base de datos
│   ├── middlewares/     # Middlewares (auth, upload, etc.)
│   ├── routes/          # Definición de rutas
│   └── utils/           # Utilidades (JWT, etc.)
├── index.js             # Punto de entrada
├── .env                 # Variables de entorno (no versionado)
├── .env.example         # Ejemplo de variables de entorno
└── package.json         # Dependencias y scripts
```

## 🔐 Variables de Entorno

| Variable          | Descripción                                         |
| ----------------- | --------------------------------------------------- |
| `PORT`            | Puerto del servidor                                 |
| `HOST`            | Host de la base de datos                            |
| `USER`            | Usuario de la base de datos                         |
| `PSW`             | Contraseña de la base de datos                      |
| `DB`              | Nombre de la base de datos                          |
| `CLOUD_NAME`      | Nombre de tu cuenta de Cloudinary                   |
| `API_KEY`         | API Key de Cloudinary                               |
| `API_SECRET`      | API Secret de Cloudinary                            |
| `JWT_SECRET`      | Secreto para firmar tokens JWT                      |
| `ALLOWED_ORIGINS` | Orígenes permitidos para CORS (separados por comas) |

## 🚀 Despliegue a Producción

### Preparación

1. **Asegúrate de que `.gitignore` esté configurado** para no subir archivos sensibles
2. **Actualiza las variables de entorno** en tu servidor de producción
3. **Configura CORS** con los dominios de producción en `ALLOWED_ORIGINS`

### Variables de Entorno en Producción

En tu servidor de producción (Railway, Render, Heroku, etc.), configura:

```bash
PORT=4000
HOST=tu-servidor-mysql.com
USER=tu_usuario_produccion
PSW=tu_password_seguro
DB=tu_base_datos_produccion
CLOUD_NAME=tu_cloudinary_name
API_KEY=tu_cloudinary_key
API_SECRET=tu_cloudinary_secret
JWT_SECRET=un_secreto_muy_seguro_y_largo
ALLOWED_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com
```

### Plataformas Recomendadas

- **Railway**: Fácil despliegue desde GitHub
- **Render**: Plan gratuito disponible
- **Heroku**: Opciones gratuitas y de pago
- **DigitalOcean**: VPS con más control

### Checklist de Producción

- [ ] Variables de entorno configuradas
- [ ] Base de datos MySQL en producción configurada
- [ ] Credenciales de Cloudinary configuradas
- [ ] CORS configurado con dominios de producción
- [ ] JWT_SECRET cambiado a un valor seguro
- [ ] `.env` no está en el repositorio (verificar `.gitignore`)
- [ ] Script `start` funciona correctamente
- [ ] Conexión a base de datos probada
- [ ] HTTPS habilitado en el servidor

## 📝 Rutas Disponibles

- `POST /login` - Autenticación de usuarios
- `GET /marcas` - Obtener todas las marcas
- `POST /marcas` - Crear nueva marca
- `PUT /marcas/:id` - Actualizar marca
- `DELETE /marcas/:id` - Eliminar marca
- `POST /upload` - Cargar imagen a Cloudinary

## 🔒 Seguridad

- Las contraseñas se hashean con bcrypt
- Autenticación mediante JWT
- CORS configurado para orígenes específicos
- Variables sensibles en archivo `.env` no versionado

## 📄 Licencia

ISC

## 👤 Autor

Fernando88323
