# 🚨 SOLUCIÓN RÁPIDA: Error "Application failed to respond" en Railway

## Error:
```
Application failed to respond
```

O también:
```
❌ Error de conexión a la DB: connect ECONNREFUSED ::1:3306
```

## Causa:
Railway NO está leyendo las variables de entorno porque el archivo `.env` no se sube a Git. La aplicación se inicia pero no puede conectarse a la base de datos.

---

## 🔥 SOLUCIÓN RÁPIDA (4 pasos):

### 1️⃣ Verificar los Logs en Railway

1. Ve a Railway Dashboard
2. Selecciona tu proyecto
3. Haz clic en tu servicio de Node.js
4. Ve a la pestaña **"Deployments"**
5. Haz clic en el deployment activo
6. Ve a **"View Logs"**

**¿Qué buscar en los logs?**
- Si ves `❌ NO CONFIGURADO` para las variables → Falta configurar variables de entorno
- Si dice "Application failed to respond" → El servidor no se está iniciando correctamente

### 2️⃣ Encontrar las Credenciales de MySQL en Railway

**IMPORTANTE:** Railway tiene 2 servicios en tu proyecto:
- 🟦 Servicio de **Node.js** (tu backend)
- 🟩 Servicio de **MySQL** (tu base de datos)

Para obtener las credenciales de MySQL:

1. En Railway Dashboard, haz clic en el servicio de **MySQL** (NO el de Node.js)
2. Ve a la pestaña **"Variables"** o **"Connect"**
3. Verás variables como:
   - `MYSQLHOST` o `MYSQL_HOST`
   - `MYSQLUSER` o `MYSQL_USER`
   - `MYSQLPORT` o `MYSQL_PORT`
   - `MYSQLPASSWORD` o `MYSQL_PASSWORD`
   - `MYSQLDATABASE` o `MYSQL_DATABASE`

Copia esos valores.

### 3️⃣ Configurar Variables en el Servicio de Node.js

Ahora ve al servicio de **Node.js** (tu backend):

1. Haz clic en el servicio de Node.js
2. Ve a **"Variables"**
3. Haz clic en **"+ New Variable"**
4. Agrega TODAS estas variables UNA POR UNA:

```
NODE_ENV=production
PORT=8080
```

Luego agrega las credenciales de MySQL que copiaste:

```
HOST=<pega-MYSQLHOST>
USER=<pega-MYSQLUSER>
DB_PORT=<pega-MYSQLPORT>
PSW=<pega-MYSQLPASSWORD>
DB=<pega-MYSQLDATABASE>
```

Y finalmente estas variables:

```
CLOUD_NAME=drfxzdtxm
API_KEY=558114351582597
API_SECRET=xZEhyj12f9cUo1nRfzpTCfaz65Y
JWT_SECRET=catalogoProductosSecret2025
ALLOWED_ORIGINS=https://tu-frontend-url.com
```

⚠️ **Reemplaza `https://tu-frontend-url.com` con la URL real de tu frontend**

### 4️⃣ Redesplegar

Railway redesplegará automáticamente al agregar las variables. Si no lo hace:

- En Railway → Deployments → **"Redeploy"**

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
