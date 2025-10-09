# 🔐 JWT y Cookies en Cross-Domain (Railway + Vercel)

## 🚨 Problema: Cookie `accessToken` vs `_vercel_jwt`

### ¿Qué está pasando?

Cuando tu backend en Railway envía una cookie `accessToken`, el navegador o Vercel puede:
1. **Bloquear la cookie** por restricciones de same-site
2. **Renombrar la cookie** a `_vercel_jwt` por seguridad
3. **No enviar la cookie** en requests subsecuentes

### ¿Por qué sucede?

**Cookies cross-domain tienen restricciones:**
- Backend: `catalogoproductosbackend-production-fcd1.up.railway.app` (Railway)
- Frontend: `catalogo-productos-xxx.vercel.app` (Vercel)

Son **dominios diferentes**, por lo que:
- Las cookies con `sameSite: "lax"` NO se envían en requests cross-origin
- Las cookies con `sameSite: "none"` requieren `secure: true` (HTTPS)
- Algunos navegadores bloquean cookies de terceros por defecto

---

## ✅ Solución: Usar Authorization Header

Para aplicaciones cross-domain, la mejor práctica es:

### **Backend: Enviar token en el response body**

Ya actualizado en el código:

```javascript
res.status(200).json({
  success: true,
  message: "Login exitoso",
  user: userWithoutPassword,
  accessToken: accessToken  // ← El frontend puede guardarlo
});
```

### **Frontend: Guardar token y enviarlo en headers**

#### 1. Al hacer login, guardar el token:

```javascript
// En tu función de login
const handleLogin = async (email, password) => {
  try {
    const response = await fetch('https://catalogoproductosbackend-production-fcd1.up.railway.app/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.success) {
      // Guardar el token en localStorage
      localStorage.setItem('accessToken', data.accessToken);
      // O en sessionStorage si prefieres que expire al cerrar el navegador
      // sessionStorage.setItem('accessToken', data.accessToken);

      // Guardar info del usuario
      localStorage.setItem('user', JSON.stringify(data.user));

      console.log('✅ Login exitoso, token guardado');
    }
  } catch (error) {
    console.error('❌ Error en login:', error);
  }
};
```

#### 2. En cada request, enviar el token en headers:

```javascript
// Crear una función helper para hacer requests autenticados
const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem('accessToken');
  
  if (!token) {
    throw new Error('No hay token de autenticación');
  }

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
};

// Ejemplo de uso:
const getMarcas = async () => {
  try {
    const response = await fetchWithAuth(
      'https://catalogoproductosbackend-production-fcd1.up.railway.app/marcas'
    );
    const data = await response.json();
    console.log('Marcas:', data);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

#### 3. Al hacer logout, limpiar el token:

```javascript
const handleLogout = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  console.log('✅ Sesión cerrada');
  // Redirigir a login
};
```

---

## 📋 Comparación de Métodos

### Método 1: Cookies HTTP-Only ❌ (No recomendado para cross-domain)

**Ventajas:**
- ✅ Más seguro contra XSS (no accesible desde JavaScript)
- ✅ Automático (el navegador las envía)

**Desventajas:**
- ❌ No funciona bien en cross-domain sin configuración compleja
- ❌ Requiere `sameSite: "none"` y `secure: true` para cross-domain
- ❌ Algunos navegadores bloquean cookies de terceros
- ❌ Problemas con proxies y CDNs (como Vercel)

### Método 2: Authorization Header ✅ (RECOMENDADO para cross-domain)

**Ventajas:**
- ✅ Funciona perfectamente en cross-domain
- ✅ Estándar de la industria
- ✅ Compatible con todos los navegadores
- ✅ Fácil de implementar
- ✅ Sin problemas con Vercel

**Desventajas:**
- ⚠️ Requiere protección contra XSS (validar/sanitizar inputs)
- ⚠️ El frontend debe gestionar el token manualmente

---

## 🔧 Configuración Completa

### Backend (Ya implementado)

```javascript
// login.controller.js
res.status(200).json({
  success: true,
  message: "Login exitoso",
  user: userWithoutPassword,
  accessToken: accessToken  // ← Token en el body
});
```

```javascript
// auth.js middleware
const validateTokenMiddleware = (req, res, next) => {
  // Buscar token en header Authorization
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;
    
  // Fallback a cookies (por compatibilidad)
  const token = tokenFromHeader || req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ 
      error: "Acceso no autorizado, token requerido" 
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Token inválido" });
    }
    req.user = decoded;
    next();
  });
};
```

### Frontend (Ejemplo con React)

#### Crear un contexto de autenticación:

```javascript
// AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cargar token al iniciar
    const savedToken = localStorage.getItem('accessToken');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch(
        'https://catalogoproductosbackend-production-fcd1.up.railway.app/auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.accessToken);
        setUser(data.user);
        return { success: true };
      }

      return { success: false, error: data.message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const fetchWithAuth = async (url, options = {}) => {
    if (!token) {
      throw new Error('No autenticado');
    }

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, fetchWithAuth, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};
```

#### Usar en componentes:

```javascript
// LoginForm.jsx
import { useAuth } from './AuthContext';

const LoginForm = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    
    if (result.success) {
      console.log('✅ Login exitoso');
      // Redirigir al dashboard
    } else {
      console.error('❌ Error:', result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
        placeholder="Email"
      />
      <input 
        type="password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)} 
        placeholder="Password"
      />
      <button type="submit">Login</button>
    </form>
  );
};
```

```javascript
// MarcasPage.jsx
import { useAuth } from './AuthContext';
import { useEffect, useState } from 'react';

const MarcasPage = () => {
  const { fetchWithAuth } = useAuth();
  const [marcas, setMarcas] = useState([]);

  useEffect(() => {
    const loadMarcas = async () => {
      try {
        const response = await fetchWithAuth(
          'https://catalogoproductosbackend-production-fcd1.up.railway.app/marcas'
        );
        const data = await response.json();
        setMarcas(data);
      } catch (error) {
        console.error('Error al cargar marcas:', error);
      }
    };

    loadMarcas();
  }, [fetchWithAuth]);

  return (
    <div>
      {marcas.map(marca => (
        <div key={marca.id}>{marca.nombre}</div>
      ))}
    </div>
  );
};
```

---

## 🔒 Seguridad

### ⚠️ Importante al usar localStorage:

1. **Protege contra XSS:**
   - Valida y sanitiza todos los inputs
   - Usa librerías como DOMPurify
   - Nunca uses `dangerouslySetInnerHTML` sin sanitizar

2. **Tokens de corta duración:**
   - El backend ya genera tokens de 3 horas
   - Considera implementar refresh tokens para mayor seguridad

3. **HTTPS obligatorio:**
   - Tanto Railway como Vercel usan HTTPS automáticamente ✅

4. **Logout al cerrar navegador:**
   - Si prefieres que la sesión expire al cerrar el navegador:
   ```javascript
   sessionStorage.setItem('accessToken', data.accessToken);
   // en lugar de localStorage
   ```

---

## 🐛 Troubleshooting

### Token no se está enviando

**Verifica:**
```javascript
// En el navegador (F12 → Console)
console.log('Token:', localStorage.getItem('accessToken'));
```

### Token inválido o expirado

**Solución:**
```javascript
// Manejar errores 401 globalmente
const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    // Token expirado o inválido
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }

  return response;
};
```

### Cookie `_vercel_jwt` aparece en lugar de `accessToken`

**Explicación:** Vercel puede estar interceptando/renombrando cookies.

**Solución:** Usa Authorization header (método recomendado arriba) ✅

---

## 📝 Resumen

| Aspecto | Cookies HTTP-Only | Authorization Header |
|---------|-------------------|---------------------|
| **Cross-domain** | ❌ Complejo | ✅ Funciona perfectamente |
| **Seguridad XSS** | ✅ Muy buena | ⚠️ Requiere cuidado |
| **Implementación** | ⚠️ Compleja | ✅ Simple |
| **Compatibilidad** | ⚠️ Problemas con algunos navegadores | ✅ Universal |
| **Vercel/CDN** | ❌ Puede causar problemas | ✅ Sin problemas |
| **Recomendado para tu caso** | ❌ No | ✅ **SÍ** |

---

## ✅ Acción Requerida

1. **Backend:** ✅ Ya actualizado (envía token en body)
2. **Frontend:** Actualizar para:
   - Guardar token del response en `localStorage`
   - Enviar token en header `Authorization: Bearer <token>`
   - Eliminar dependencia de cookies

---

**Última actualización:** Octubre 2025
