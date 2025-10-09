# 🔒 Configurar CORS para Vercel en Railway

## 🚨 Error CORS

Si ves este error en la consola del navegador:

```
Access to fetch at 'https://catalogoproductosbackend-production-fcd1.up.railway.app/...' 
from origin 'https://catalogo-productos-xxx.vercel.app' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Significa:** Tu frontend en Vercel no está autorizado para acceder al backend en Railway.

---

## ✅ Solución Rápida

### Paso 1: Obtener la URL de Vercel

Vercel genera diferentes URLs para cada deployment:

1. **URL de Preview** (cambia con cada deployment):
   ```
   https://catalogo-productos-qd1u0vakk-fernandos-projects-9d4a6279.vercel.app
   ```

2. **URL de Producción** (la principal, no cambia):
   ```
   https://tu-proyecto.vercel.app
   ```

**Recomendación:** Usa ambas o configura un dominio personalizado.

### Paso 2: Configurar ALLOWED_ORIGINS en Railway

Ve a Railway Dashboard y agrega/actualiza la variable `ALLOWED_ORIGINS`:

#### Opción A: Solo un dominio
```
ALLOWED_ORIGINS=https://tu-proyecto.vercel.app
```

#### Opción B: Múltiples dominios (recomendado)
```
ALLOWED_ORIGINS=http://localhost:5173,https://catalogo-productos-qd1u0vakk-fernandos-projects-9d4a6279.vercel.app,https://tu-proyecto.vercel.app
```

⚠️ **IMPORTANTE:**
- **NO uses espacios** después de las comas
- **NO pongas `/` al final** de las URLs
- **Incluye `http://` o `https://`**
- **Incluye `localhost` para desarrollo local**

### Paso 3: Redesplegar

Railway redesplegará automáticamente al cambiar la variable. Espera 2-3 minutos.

---

## 🔍 Verificar Configuración

### 1. Ver qué dominios están configurados

En los logs de Railway, cuando inicie el servidor verás:

```
🔧 CORS configurado para: [
  'http://localhost:5173',
  'https://catalogo-productos-xxx.vercel.app',
  'https://tu-proyecto.vercel.app'
]
```

### 2. Probar desde el navegador

Abre la consola del navegador (F12) y ejecuta:

```javascript
fetch('https://catalogoproductosbackend-production-fcd1.up.railway.app/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

- ✅ **Si funciona:** Verás el objeto JSON
- ❌ **Si falla:** Verás el error de CORS

---

## 📋 Configuración Completa (Paso a Paso)

### En Railway:

1. Ve a https://railway.app
2. Abre tu proyecto `CatalogoProductosBackend`
3. Haz clic en el servicio de **Node.js**
4. Ve a **"Variables"**
5. Busca o crea `ALLOWED_ORIGINS`
6. Agrega tus URLs:

```
ALLOWED_ORIGINS=http://localhost:5173,https://catalogo-productos-qd1u0vakk-fernandos-projects-9d4a6279.vercel.app,https://tu-dominio-principal.vercel.app
```

### URLs a incluir:

1. **Desarrollo local:**
   ```
   http://localhost:5173
   http://localhost:3000
   ```

2. **Preview de Vercel (la URL actual del error):**
   ```
   https://catalogo-productos-qd1u0vakk-fernandos-projects-9d4a6279.vercel.app
   ```

3. **Producción de Vercel (si tienes):**
   ```
   https://tu-proyecto.vercel.app
   ```

4. **Dominio personalizado (si tienes):**
   ```
   https://tu-dominio.com
   https://www.tu-dominio.com
   ```

---

## 🎯 Ejemplo Completo

```bash
# En Railway, variable ALLOWED_ORIGINS:

ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,https://catalogo-productos-qd1u0vakk-fernandos-projects-9d4a6279.vercel.app,https://catalogo-productos.vercel.app,https://www.catalogo-productos.com
```

---

## 🐛 Problemas Comunes

### Error: "CORS: El origen ... no está permitido"

**Causa:** La URL del frontend no está en `ALLOWED_ORIGINS`

**Solución:**
1. Copia la URL exacta del error
2. Agrégala a `ALLOWED_ORIGINS` en Railway
3. Espera el redespliegue

### Error: "Request has been blocked by CORS policy"

**Causa:** El backend no está enviando los headers CORS correctos

**Solución:**
1. Verifica que `ALLOWED_ORIGINS` esté configurado en Railway
2. Revisa los logs para ver si el backend está arrancando
3. Asegúrate de que no hay espacios extra en las URLs

### El CORS funciona en Postman pero no en el navegador

**Causa:** Postman no valida CORS, los navegadores sí

**Solución:** Configura correctamente `ALLOWED_ORIGINS` con el dominio de tu frontend

### Diferentes URLs de Vercel en cada deployment

**Causa:** Vercel genera URLs únicas para cada preview deployment

**Soluciones:**

1. **Usar dominio de producción:**
   - Configura un dominio principal en Vercel
   - Usa solo ese dominio en `ALLOWED_ORIGINS`

2. **Permitir todos los subdominios de Vercel (no recomendado):**
   - Modifica el código de CORS para usar regex
   - Permite `*.vercel.app`

3. **Agregar cada URL manualmente (temporal):**
   - Cada vez que despliegues, copia la nueva URL
   - Agrégala a `ALLOWED_ORIGINS` en Railway

---

## 🔐 Seguridad

### ✅ Buenas Prácticas:

1. **Solo dominios específicos:** No uses `*` en producción
2. **HTTPS en producción:** No uses `http://` en producción
3. **Lista actualizada:** Mantén solo los dominios activos
4. **Dominio principal:** Usa el dominio de producción, no los de preview

### ❌ Evita:

```javascript
// ❌ NO HAGAS ESTO EN PRODUCCIÓN
app.use(cors({
  origin: '*'  // Permite TODOS los dominios - inseguro
}));
```

---

## 📝 Configuración Recomendada

### Para Desarrollo (Local):

```bash
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173
```

### Para Producción (Railway):

```bash
ALLOWED_ORIGINS=https://tu-proyecto.vercel.app,https://www.tu-dominio.com
```

### Para Desarrollo + Producción:

```bash
ALLOWED_ORIGINS=http://localhost:5173,https://catalogo-productos-preview-xxx.vercel.app,https://catalogo-productos.vercel.app,https://tu-dominio.com
```

---

## 🧪 Probar la Configuración

### 1. Desde el navegador (consola F12):

```javascript
// Prueba simple
fetch('https://catalogoproductosbackend-production-fcd1.up.railway.app/health')
  .then(r => r.json())
  .then(data => console.log('✅ CORS OK:', data))
  .catch(err => console.error('❌ CORS Error:', err));

// Prueba con credenciales
fetch('https://catalogoproductosbackend-production-fcd1.up.railway.app/marcas', {
  credentials: 'include'
})
  .then(r => r.json())
  .then(data => console.log('✅ Con credenciales:', data))
  .catch(err => console.error('❌ Error:', err));
```

### 2. Desde curl:

```bash
# Simular request desde Vercel
curl -H "Origin: https://catalogo-productos-xxx.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://catalogoproductosbackend-production-fcd1.up.railway.app/health
```

Si está configurado correctamente, verás headers como:
```
Access-Control-Allow-Origin: https://catalogo-productos-xxx.vercel.app
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
```

---

## 📞 Ayuda Adicional

Si después de configurar `ALLOWED_ORIGINS` sigues teniendo problemas:

1. **Verifica la variable en Railway:**
   - Ve a Railway → Tu proyecto → Servicio Node.js → Variables
   - Verifica que `ALLOWED_ORIGINS` esté correctamente configurado
   - Sin espacios, sin `/` al final

2. **Revisa los logs de Railway:**
   - Busca el mensaje: `🔧 CORS configurado para:`
   - Debe incluir tu dominio de Vercel

3. **Verifica el error exacto:**
   - Copia la URL completa del error en la consola
   - Asegúrate de que esté en `ALLOWED_ORIGINS`

4. **Limpia caché:**
   - Limpia la caché del navegador
   - Prueba en modo incógnito

---

**Última actualización:** Octubre 2025
