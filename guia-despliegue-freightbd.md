# Guía de despliegue en Vercel

La aplicación completa se despliega en Vercel: frontend Vite y backend Express
como función serverless. MongoDB Atlas conserva los datos.

## 1. Configura MongoDB Atlas

1. En MongoDB Atlas crea el proyecto y cluster `freightbd-dashboard`.
2. En **Database Access**, crea un usuario de base de datos.
3. En **Network Access**, permite las conexiones necesarias para Vercel. Para
   una entrega escolar puedes usar `0.0.0.0/0` con una contraseña segura.
4. Copia la cadena de conexión y reemplaza usuario y contraseña:

```text
mongodb+srv://USUARIO:CONTRASEÑA@freightbd-dashboard.nt5oco3.mongodb.net/?appName=freightbd-dashboard
```

## 2. Prepara el repositorio

Desde la raíz del proyecto:

```bash
git add .
git commit -m "deploy: preparar Vercel con MongoDB"
git push origin main
```

No subas `server/.env`. Está ignorado por Git.

## 3. Importa el proyecto en Vercel

1. Entra a https://vercel.com/new y selecciona el repositorio.
2. Deja **Root Directory** en la raíz del proyecto.
3. Vercel detectará Vite. La configuración del archivo `vercel.json` define el
   build, la función API y la ruta `/api`.
4. En **Environment Variables**, agrega para Production, Preview y Development:

```text
APP_PASSWORD_HASH=hash bcrypt de la contraseña del dashboard
JWT_SECRET=secreto largo y aleatorio
MONGODB_URI= cadena de conexión de MongoDB Atlas
MONGODB_DB=freightbd
ALLOWED_ORIGINS=https://TU-PROYECTO.vercel.app
```

No es necesario definir `VITE_API_URL`: Vercel usa `/api` mediante la
configuración incluida.

5. Pulsa **Deploy**.

## 4. Verifica la aplicación

Abre estos endpoints usando el dominio que Vercel asignó:

```text
https://TU-PROYECTO.vercel.app/api/ping
https://TU-PROYECTO.vercel.app
```

`/api/ping` debe responder `{"ok":true}`. Después inicia sesión, consulta los
clientes migrados y crea un cliente y un flete de prueba.

## 5. Migrar datos SQLite existentes

Si aún no ejecutaste la migración local, configura `MONGODB_URI` en `server/.env`
y ejecuta una sola vez:

```bash
npm run migrate --prefix server
```

El comando conserva IDs y relaciones, y es idempotente.

## 6. Dominio y HTTPS

En Vercel abre **Settings > Domains**, agrega el dominio y configura el registro
DNS que Vercel indique. Vercel proporciona HTTPS automáticamente.
