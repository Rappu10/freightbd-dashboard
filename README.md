# FreightBD Dashboard

Aplicación web para administrar clientes y fletes de materiales como arena,
grava, rajuela, ladrillo y escombro.

## Tecnologías

- Frontend: React, Vite y Tailwind CSS.
- Backend: Node.js, Express y API REST.
- Base de datos: MongoDB Atlas.
- Despliegue: Vercel, con el frontend y la API en el mismo proyecto.
- Servicio externo: Open-Meteo para mostrar el clima de referencia.

## Ejecución local

### Requisitos

- Node.js 20 o superior.
- Una base de datos MongoDB Atlas.
- Git, si se clona desde GitHub.

### Configurar el backend

```bash
cd server
npm install
cp .env.example .env
node generate-hash.js "una-contraseña-de-al-menos-8-caracteres"
```

Copia el hash que imprime el comando en `APP_PASSWORD_HASH` dentro de
`server/.env`. Completa también:

```env
JWT_SECRET=un-secreto-largo-y-aleatorio
MONGODB_URI=mongodb+srv://USUARIO:CONTRASENA@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=freightbd
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Nunca subas `server/.env` al repositorio.

### Iniciar la aplicación

En una terminal:

```bash
cd server
npm start
```

En otra terminal, desde la raíz:

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. La API local utiliza `http://localhost:4000/api`.
También puedes iniciar ambos procesos con:

```bash
npm run start:all
```

## Pruebas y build

```bash
npm test
npm run build
```

La prueba automatizada verifica la generación y validación de hashes bcrypt.
GitHub Actions ejecuta las pruebas y el build en cada push y Pull Request.

## Migrar datos antiguos

Si existe una base SQLite de una instalación anterior, configura `MONGODB_URI`
en `server/.env` y ejecuta una sola vez:

```bash
npm run migrate --prefix server
```

La migración conserva IDs, clientes, fletes y relaciones. Es idempotente.

## Docker

Docker requiere que MongoDB Atlas esté configurado previamente:

```bash
export APP_PASSWORD_HASH="hash-bcrypt"
export JWT_SECRET="secreto-largo"
export MONGODB_URI="mongodb+srv://USUARIO:CONTRASENA@cluster.mongodb.net/?retryWrites=true&w=majority"
export MONGODB_DB="freightbd"
docker compose up --build -d
```

Abre `http://localhost:8080`. Para detener los servicios:

```bash
docker compose down
```

## Seguridad

- Contraseñas protegidas con bcrypt.
- Sesiones JWT con duración de 12 horas.
- Validación de datos en frontend y backend.
- Helmet, CORS y rate limiting.
- Variables sensibles fuera del repositorio.
- HTTPS proporcionado por Vercel en producción.

## Documentación

- Requisitos y arquitectura: [REQUERIMIENTOS.md](REQUERIMIENTOS.md)
- Despliegue: [guia-despliegue-freightbd.md](guia-despliegue-freightbd.md)
- Manual de usuario: [MANUAL-USUARIO.md](MANUAL-USUARIO.md)
- Evidencias: [EVIDENCIAS.md](EVIDENCIAS.md)
