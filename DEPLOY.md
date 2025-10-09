# 🚀 Guía de Despliegue a Railway

## ⚠️ PROBLEMA COMÚN: Error de conexión a la base de datos

### Error:

```
❌ Error de conexión a la DB: connect ECONNREFUSED ::1:3306
[dotenv@17.2.2] injecting env (0) from .env
```

### Causa:

Railway **NO lee el archivo `.env`** porque este archivo no se sube a Git (está en `.gitignore`). Las variables de entorno deben configurarse directamente en Railway.

---

## 🔧 SOLUCIÓN: Configurar Variables de Entorno en Railway

### Paso 1: Acceder a Railway

1. Ve a https://railway.app
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto `CatalogoProductosBackend`
4. Ve a la pestaña **"Variables"** o **"Settings > Variables"**

### Paso 2: Agregar Variables de Entorno

Copia y pega estas variables **UNA POR UNA** en Railway:

```bash
NODE_ENV=production
PORT=8080
HOST=tramway.proxy.rlwy.net
USER=root
DB_PORT=56180
PSW=wYzXthBKkozVtXLsaLABOsoQsQIHtxaC
DB=railway
CLOUD_NAME=drfxzdtxm
API_KEY=558114351582597
API_SECRET=xZEhyj12f9cUo1nRfzpTCfaz65Y
JWT_SECRET=catalogoProductosSecret2025
ALLOWED_ORIGINS=https://tu-frontend-url.vercel.app
```

⚠️ **IMPORTANTE**:

- Reemplaza `https://tu-frontend-url.vercel.app` con la URL real de tu frontend
- Si tienes múltiples dominios, sepáralos con comas: `https://dominio1.com,https://dominio2.com`

### Paso 3: Verificar la Base de Datos de Railway

1. En Railway, ve a tu servicio de **MySQL**
2. Copia las credenciales que Railway te proporciona
3. Actualiza las variables `HOST`, `USER`, `DB_PORT`, `PSW`, y `DB` con esos valores

**Ejemplo de variables de Railway MySQL:**

```bash
HOST=containers-us-west-123.railway.app
USER=root
DB_PORT=5432
PSW=AbCdEfGhIjKlMnOpQrStUvWxYz
DB=railway
```

### Paso 4: Redesplegar

Después de configurar las variables:

1. Ve a **"Deployments"**
2. Haz clic en **"Redeploy"** o haz un nuevo commit a tu repositorio
3. Espera a que termine el despliegue
4. Verifica los logs para confirmar la conexión exitosa: `✅ Conectado a la DB`

---

## 📋 Checklist de Variables de Entorno

- [ ] `NODE_ENV=production`
- [ ] `PORT=8080`
- [ ] `HOST` (de Railway MySQL)
- [ ] `USER` (de Railway MySQL)
- [ ] `DB_PORT` (de Railway MySQL)
- [ ] `PSW` (de Railway MySQL)
- [ ] `DB` (de Railway MySQL)
- [ ] `CLOUD_NAME` (de Cloudinary)
- [ ] `API_KEY` (de Cloudinary)
- [ ] `API_SECRET` (de Cloudinary)
- [ ] `JWT_SECRET`
- [ ] `ALLOWED_ORIGINS` (URL de tu frontend)

---

## ✅ Cambios Realizados en el Código

### 1. Mejoras en `src/database/config.js`

- ✅ Soporte para `DATABASE_URL` (variable común de Railway)
- ✅ Mejor manejo de errores con información detallada
- ✅ Logs informativos para debugging

### 2. Archivos Importantes

- ✅ `.gitignore` - Para proteger archivos sensibles
- ✅ `.env.example` - Plantilla de variables de entorno
- ✅ `README.md` - Documentación completa del proyecto
- ✅ `.nvmrc` - Versión de Node.js recomendada

### 2. Archivos Actualizados

- ✅ `package.json` - Añadido script `start` y especificación de engines
- ✅ `index.js` - CORS dinámico y manejo de errores global
- ✅ `src/database/config.js` - Pool de conexiones mejorado
- ✅ `.env` - Añadidas variables NODE_ENV y ALLOWED_ORIGINS

## 📋 Checklist Antes de Subir a Producción

### Seguridad

- [ ] Verificar que `.gitignore` incluye `.env`
- [ ] Cambiar `JWT_SECRET` a un valor más seguro (mínimo 32 caracteres)
- [ ] Nunca commitear el archivo `.env` real
- [ ] Verificar que las credenciales de Cloudinary son correctas

### Variables de Entorno

Tu archivo `.env` actual está configurado para desarrollo. En producción necesitarás:

```bash
NODE_ENV=production
PORT=4000
HOST=tu-servidor-mysql-produccion.com
USER=usuario_produccion
PSW=password_seguro_produccion
DB=nombre_db_produccion
CLOUD_NAME=drfxzdtxm
API_KEY=558114351582697
API_SECRET=xZEhyj12f9cUo1nRfzpTCfaz65Y
JWT_SECRET=un_secreto_muy_largo_y_seguro_para_produccion_minimo_32_caracteres
ALLOWED_ORIGINS=https://tu-dominio-frontend.com,https://www.tu-dominio-frontend.com
```

### Base de Datos

- [ ] Crear base de datos en el servidor de producción
- [ ] Ejecutar las migraciones/scripts SQL necesarios
- [ ] Verificar que el usuario de la BD tiene los permisos correctos
- [ ] Probar la conexión desde tu servidor de producción

## 🌐 Plataformas de Despliegue Recomendadas

### 1. Railway (Recomendado - Muy Fácil)

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Inicializar proyecto
railway init

# Añadir MySQL
railway add

# Configurar variables de entorno en el dashboard de Railway

# Desplegar
railway up
```

**Ventajas:**

- ✅ Muy fácil de usar
- ✅ MySQL incluido
- ✅ Auto-deploy desde GitHub
- ✅ Plan gratuito disponible

**URL:** https://railway.app

### 2. Render

```bash
# Crear cuenta en render.com
# Conectar tu repositorio de GitHub
# Configurar variables de entorno
# Auto-deploy configurado
```

**Ventajas:**

- ✅ Plan gratuito
- ✅ SSL automático
- ✅ Fácil integración con GitHub

**URL:** https://render.com

### 3. Heroku

```bash
# Instalar Heroku CLI
npm install -g heroku

# Login
heroku login

# Crear app
heroku create tu-app-backend

# Añadir MySQL
heroku addons:create cleardb:ignite

# Configurar variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=tu_secreto_seguro

# Desplegar
git push heroku main
```

**URL:** https://heroku.com

### 4. DigitalOcean App Platform

- Más control
- Configuración similar a Railway
- Buenos precios

**URL:** https://www.digitalocean.com/products/app-platform

## 🔧 Pasos para Despliegue (General)

### 1. Preparar el Repositorio

```bash
# Asegurarse de que estás en la rama correcta
git status

# Commitear todos los cambios
git add .
git commit -m "Preparado para producción"

# Push a GitHub
git push origin cloudinary
```

### 2. Configurar el Servidor de Producción

**Opción A: Desde Dashboard Web (Railway, Render, Heroku)**

1. Conectar tu repositorio de GitHub
2. Seleccionar la rama `cloudinary`
3. Configurar las variables de entorno (copiar desde `.env` pero con valores de producción)
4. Configurar el comando de inicio: `npm start` o `pnpm start`
5. Desplegar

**Opción B: Desde CLI**

```bash
# Ver instrucciones específicas de cada plataforma arriba
```

### 3. Configurar Base de Datos en Producción

**Si usas MySQL de la plataforma:**

1. La plataforma te dará las credenciales (HOST, USER, PSW, DB)
2. Actualizar las variables de entorno con esos valores
3. Conectar y ejecutar tus scripts SQL

**Si usas MySQL externo (como PlanetScale o AWS RDS):**

1. Crear la base de datos en ese servicio
2. Obtener las credenciales de conexión
3. Configurar las variables de entorno

### 4. Verificar el Despliegue

Una vez desplegado:

```bash
# Probar endpoint de salud
curl https://tu-backend.com/

# Probar login
curl -X POST https://tu-backend.com/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# Ver logs
# (en Railway) railway logs
# (en Heroku) heroku logs --tail
```

## 🔍 Troubleshooting Común

### Error: "Cannot connect to database"

- Verificar que HOST, USER, PSW, DB están correctos
- Verificar que el servidor de BD permite conexiones remotas
- Verificar el puerto de MySQL (por defecto 3306)

### Error: "CORS policy blocked"

- Verificar que `ALLOWED_ORIGINS` incluye el dominio del frontend
- Asegurarse de usar HTTPS en producción
- No incluir espacios en `ALLOWED_ORIGINS`

### Error: "Module not found"

- Ejecutar `npm install` o `pnpm install` en el servidor
- Verificar que todas las dependencias están en `package.json`

### Error: "Port already in use"

- Verificar que `PORT` en `.env` está disponible
- Usar el PORT que proporciona la plataforma: `process.env.PORT`

## 📊 Monitoreo Post-Despliegue

### Cosas a monitorear:

1. **Logs del servidor** - Errores y warnings
2. **Uso de memoria** - No exceder límites del plan
3. **Tiempo de respuesta** - Optimizar queries lentas
4. **Conexiones a BD** - Verificar que el pool funciona bien
5. **Uso de Cloudinary** - Verificar límites del plan

### Herramientas recomendadas:

- **Sentry** - Tracking de errores
- **New Relic** - Monitoreo de performance
- **Logs nativos** - De Railway, Render, etc.

## 🔐 Seguridad Post-Despliegue

### Inmediatamente:

1. Cambiar `JWT_SECRET` a un valor muy seguro
2. Habilitar HTTPS (automático en la mayoría de plataformas)
3. Revisar que CORS solo permite tus dominios
4. Verificar que `.env` no está en el repositorio

### A largo plazo:

1. Implementar rate limiting
2. Añadir helmet.js para headers de seguridad
3. Implementar logs de auditoría
4. Configurar backups automáticos de la BD
5. Implementar SSL pinning si es necesario

## 📝 Ejemplo de Variables de Entorno en Producción

```bash
# En el dashboard de tu plataforma, agregar:
NODE_ENV=production
PORT=4000
HOST=mysql-production-server.railway.app
USER=root
PSW=a6k2j9fn2k3nf9k2nf3k2
DB=railway
CLOUD_NAME=drfxzdtxm
API_KEY=558114351582697
API_SECRET=xZEhyj12f9cUo1nRfzpTCfaz65Y
JWT_SECRET=2h8f9j3k2nf9k2nf3k2nf9k2nf3k2nf9k2nf3k2nf9k2
ALLOWED_ORIGINS=https://mi-catalogo.com,https://www.mi-catalogo.com
```

## ✨ Siguientes Pasos

Después del despliegue:

1. Probar todas las funcionalidades
2. Configurar CI/CD para auto-deploy
3. Implementar tests automatizados
4. Documentar las APIs con Swagger
5. Configurar dominio personalizado
6. Implementar caché con Redis (opcional)

## 📞 Soporte

Si tienes problemas:

1. Revisar los logs del servidor
2. Verificar las variables de entorno
3. Probar la conexión a la base de datos
4. Consultar la documentación de la plataforma

---

**¡Listo para producción! 🚀**

Recuerda: La configuración actual está lista, solo necesitas:

1. Elegir una plataforma
2. Configurar las variables de entorno de producción
3. Desplegar
4. ¡Probar!
