# Guía de despliegue: Vercel + MongoDB Atlas

La aplicación completa se publica en Vercel: el frontend Vite y la API Express
se despliegan desde el mismo repositorio. MongoDB Atlas almacena los datos.

## 1. Preparar MongoDB Atlas

1. Crea o abre el proyecto `freightbd-dashboard` en MongoDB Atlas.
2. En **Database Access**, crea un usuario de base de datos.
3. En **Network Access**, agrega las conexiones permitidas. Para una entrega
   escolar puedes usar `0.0.0.0/0` con una contraseña fuerte.
4. Copia la cadena de conexión con este formato:

```text
mongodb+srv://USUARIO:CONTRASENA@freightbd-dashboard.nt5oco3.mongodb.net/?appName=freightbd-dashboard
```

No pegues la cadena en archivos versionados, capturas ni mensajes públicos.

## 2. Preparar variables

En `server/.env` local o en Vercel configura:

```env
APP_PASSWORD_HASH=hash-bcrypt-del-dashboard
JWT_SECRET=secreto-largo-y-aleatorio
MONGODB_URI=mongodb+srv://USUARIO:CONTRASENA@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=freightbd
ALLOWED_ORIGINS=https://freightbd-dashboard.vercel.app
```

En Vercel selecciona **Production**, **Preview** y **Development** para las
variables. No es necesario agregar `VITE_API_URL` en producción: el proyecto
usa `/api` en el mismo dominio.

## 3. Migrar datos existentes

Si existe una instalación SQLite anterior, ejecuta localmente una sola vez:

```bash
npm run migrate --prefix server
```

La migración conserva IDs y relaciones y puede repetirse sin duplicar registros.

## 4. Subir el proyecto

Desde la raíz:

```bash
git switch main
git add .
git commit -m "docs: actualizar documentación final"
git push origin main
```

La rama `main` es la rama que Vercel despliega. No subas `server/.env`.

## 5. Crear el proyecto en Vercel

1. Entra a https://vercel.com/new.
2. Importa `Rappu10/freightbd-dashboard`.
3. Deja **Root Directory** en la raíz del proyecto.
4. Usa el build configurado en `vercel.json`.
5. Agrega las variables de entorno del paso 2.
6. Pulsa **Deploy**.

La configuración incluye `api/index.js`, que publica Express como función
serverless, y dirige las rutas `/api/*` al backend.

## 6. Verificar el despliegue

Abre:

```text
https://freightbd-dashboard.vercel.app/
https://freightbd-dashboard.vercel.app/api/ping
```

El segundo endpoint debe responder:

```json
{"ok":true}
```

Después inicia sesión, confirma que aparecen los clientes migrados y crea un
cliente y un flete de prueba.

## 7. HTTPS y dominio

Vercel entrega HTTPS automáticamente. Para usar un dominio propio, abre
**Project Settings > Domains**, agrega el dominio y configura los registros DNS
que Vercel indique.

## 8. Redeploy y solución de problemas

- Después de cambiar variables, ejecuta **Redeploy** en Vercel.
- Si la API devuelve `500`, revisa `MONGODB_URI`, `MONGODB_DB` y el acceso de
  red de MongoDB Atlas.
- Si la API devuelve `404`, confirma que el deployment usa la rama `main` y el
  commit que contiene `api/index.js` y `vercel.json`.
- Revisa los **Build Logs** y **Runtime Logs** de Vercel.
