# 🚂 Guía Paso a Paso: Configurar Variables en Railway

## 📊 Verificar el Estado Actual

### Paso 1: Ver los Logs

1. Ve a https://railway.app
2. Abre tu proyecto `CatalogoProductosBackend`
3. Verás 2 servicios:
   - 🟦 **Node.js** (tu backend)
   - 🟩 **MySQL** (tu base de datos)

4. Haz clic en el servicio **Node.js**
5. Ve a **"Deployments"** → Haz clic en el último deployment
6. Haz clic en **"View Logs"**

### ¿Qué verás en los logs?

**Si ves esto:**
```
❌ Error de conexión a la DB: ...
   HOST: ❌ NO CONFIGURADO
   USER: ❌ NO CONFIGURADO
   DB_PORT: ❌ NO CONFIGURADO
```
👉 **Necesitas configurar las variables de entorno**

**Si ves esto:**
```
✅ Conectado a la DB: railway
🚀 Servidor corriendo en 0.0.0.0:8080
```
👉 **¡Todo funciona correctamente!**

---

## 🔧 Configurar Variables de Entorno

### Paso 2: Obtener Credenciales de MySQL

1. En Railway Dashboard, haz clic en el servicio de **MySQL** (🟩 el verde/azul, no el de Node.js)
2. Ve a la pestaña **"Variables"**
3. Verás algo como esto:

```
MYSQLHOST = containers-us-west-123.railway.app
MYSQLUSER = root
MYSQLPORT = 3306
MYSQLPASSWORD = AbCdEfGh123456
MYSQLDATABASE = railway
```

**📋 Copia estos valores** - los necesitarás en el siguiente paso.

> **Nota:** Los nombres pueden variar:
> - `MYSQL_HOST` o `MYSQLHOST`
> - `MYSQL_USER` o `MYSQLUSER`
> - etc.

### Paso 3: Configurar Variables en el Servicio Node.js

1. Regresa al servicio de **Node.js** (haz clic en él)
2. Ve a la pestaña **"Variables"**
3. Haz clic en **"New Variable"** o **"+ Add Variable"**

Agrega estas variables **UNA POR UNA**:

#### Variables del Sistema
```
NODE_ENV = production
PORT = 8080
```

#### Variables de MySQL (usa los valores que copiaste)
```
HOST = containers-us-west-123.railway.app
USER = root
DB_PORT = 3306
PSW = AbCdEfGh123456
DB = railway
```

⚠️ **Reemplaza con tus valores reales del paso 2**

#### Variables de Cloudinary
```
CLOUD_NAME = drfxzdtxm
API_KEY = 558114351582597
API_SECRET = xZEhyj12f9cUo1nRfzpTCfaz65Y
```

#### Variables de Seguridad
```
JWT_SECRET = catalogoProductosSecret2025
ALLOWED_ORIGINS = https://tu-frontend-url.vercel.app
```

⚠️ **Reemplaza `https://tu-frontend-url.vercel.app` con la URL real de tu frontend**

### Paso 4: Verificar y Redesplegar

1. Después de agregar todas las variables, Railway redesplegará automáticamente
2. Si no lo hace, ve a **"Deployments"** → **"Redeploy"**
3. Espera 1-2 minutos
4. Ve a **"View Logs"** nuevamente

**Deberías ver:**
```
✅ Conectado a la DB: railway
🔧 Host: containers-us-west-123.railway.app
🔧 Port: 3306
==================================================
🚀 Servidor corriendo en 0.0.0.0:8080
📝 Modo: production
🔗 Health check: http://0.0.0.0:8080/health
==================================================
```

---

## ✅ Verificar que Funciona

### Método 1: Probar el Health Check

Abre en tu navegador:
```
https://catalogoproductosbackend-production-fcd1.up.railway.app/health
```

Deberías ver:
```json
{
  "status": "ok",
  "message": "Server is running",
  "timestamp": "2025-10-09T...",
  "env": "production"
}
```

### Método 2: Probar un Endpoint

Si tienes un endpoint público (como `/marcas`), pruébalo:
```
https://catalogoproductosbackend-production-fcd1.up.railway.app/marcas
```

---

## 🐛 Troubleshooting

### Error: "Application failed to respond"

**Causa:** El servidor no se está iniciando correctamente

**Solución:**
1. Ve a los logs en Railway
2. Busca mensajes de error
3. Verifica que TODAS las variables estén configuradas
4. Asegúrate de que `PORT=8080`

### Error: "Cannot connect to database"

**Causa:** Las credenciales de MySQL son incorrectas

**Solución:**
1. Ve al servicio de MySQL en Railway
2. Copia las credenciales exactas
3. Ve al servicio de Node.js → Variables
4. Actualiza `HOST`, `USER`, `DB_PORT`, `PSW`, `DB`
5. Redespliega

### Error: "CORS policy blocked"

**Causa:** `ALLOWED_ORIGINS` no incluye tu frontend

**Solución:**
1. Ve a Variables en el servicio de Node.js
2. Encuentra `ALLOWED_ORIGINS`
3. Agrega la URL de tu frontend:
   ```
   ALLOWED_ORIGINS=https://tu-app.vercel.app,https://www.tu-app.vercel.app
   ```
4. Redespliega

---

## 📝 Checklist Final

- [ ] Servicio de MySQL está corriendo en Railway
- [ ] Variables de entorno configuradas en el servicio de Node.js
- [ ] `NODE_ENV=production`
- [ ] `PORT=8080`
- [ ] `HOST` apunta al servidor de MySQL de Railway
- [ ] `USER`, `DB_PORT`, `PSW`, `DB` son correctos
- [ ] `ALLOWED_ORIGINS` incluye la URL del frontend
- [ ] Logs muestran `✅ Conectado a la DB`
- [ ] `/health` responde correctamente
- [ ] Los endpoints de la API funcionan

---

## 🎉 ¡Listo!

Tu backend debería estar funcionando correctamente en:
```
https://catalogoproductosbackend-production-fcd1.up.railway.app
```

Ahora puedes conectar tu frontend con esta URL.

---

## 📞 Ayuda Adicional

Si sigues teniendo problemas:
1. Revisa los logs completos en Railway
2. Verifica que las variables estén bien escritas (sin espacios extra)
3. Asegúrate de que MySQL está corriendo
4. Contacta al soporte de Railway si el problema persiste
