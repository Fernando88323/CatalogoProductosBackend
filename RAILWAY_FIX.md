# 🚨 SOLUCIÓN RÁPIDA: Error de Conexión en Railway

## Error:

```
❌ Error de conexión a la DB: connect ECONNREFUSED ::1:3306
```

## Causa:

Railway NO está leyendo las variables de entorno porque el archivo `.env` no se sube a Git.

---

## 🔥 SOLUCIÓN RÁPIDA (3 pasos):

### 1️⃣ Ir a Railway Dashboard

Ve a: https://railway.app → Tu Proyecto → **Variables**

### 2️⃣ Copiar y Pegar estas Variables

**IMPORTANTE:** Ve a tu servicio de MySQL en Railway y copia las credenciales reales que Railway te da.

Luego agrega cada variable:

```
NODE_ENV=production
PORT=8080
HOST=<copia-el-host-de-railway-mysql>
USER=<copia-el-user-de-railway-mysql>
DB_PORT=<copia-el-port-de-railway-mysql>
PSW=<copia-el-password-de-railway-mysql>
DB=railway
CLOUD_NAME=drfxzdtxm
API_KEY=558114351582597
API_SECRET=xZEhyj12f9cUo1nRfzpTCfaz65Y
JWT_SECRET=catalogoProductosSecret2025
ALLOWED_ORIGINS=https://tu-frontend-url.com
```

### 3️⃣ Redesplegar

- Opción A: Haz un nuevo commit y push
- Opción B: En Railway → Deployments → Redeploy

---

## 🔍 Cómo Encontrar las Credenciales de MySQL en Railway

1. Ve a tu proyecto en Railway
2. Busca el servicio/container de **MySQL** (no el de Node.js)
3. Haz clic en él
4. Ve a la pestaña **"Variables"** o **"Connect"**
5. Copia los valores:
   - `MYSQLHOST` → usar como `HOST`
   - `MYSQLUSER` → usar como `USER`
   - `MYSQLPORT` → usar como `DB_PORT`
   - `MYSQLPASSWORD` → usar como `PSW`
   - `MYSQLDATABASE` → usar como `DB`

---

## ✅ Verificar que Funciona

Después del redespliegue, en los logs de Railway deberías ver:

```
✅ Conectado a la DB: railway
🔧 Host: containers-us-west-123.railway.app
🔧 Port: 5432
Corriendo en el puerto: 8080
```

Si ves esto, ¡está funcionando! 🎉

---

## ❓ Preguntas Frecuentes

**P: ¿Por qué dice "injecting env (0)"?**  
R: Porque Railway no encuentra el archivo `.env`. Es normal y se soluciona configurando las variables en Railway.

**P: ¿Tengo que subir el archivo `.env` a Git?**  
R: ¡NO! Por seguridad, el `.env` está en `.gitignore` y no debe subirse.

**P: ¿Dónde configuro ALLOWED_ORIGINS?**  
R: Ponle la URL de tu frontend en Vercel/Netlify. Ejemplo: `https://mi-app.vercel.app`

**P: ¿Qué pasa si uso la misma DB de desarrollo?**  
R: No es recomendado. Railway tiene su propia base de datos MySQL que debes usar.
