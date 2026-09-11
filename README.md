# FreightBD Dashboard

Panel para llevar el control de clientes y sus fletes de material (arena,
grava, rajuela, ladrillo, escombro). Frontend en React + Vite + Tailwind,
backend en Express con autenticación por contraseña y MongoDB Atlas.

## Desarrollo local

**1. Backend**

```bash
cd server
npm install
node generate-hash.js "tu-password-de-al-menos-8-caracteres"
```

Copia el `APP_PASSWORD_HASH` que te imprime, crea un archivo `server/.env`
(a partir de `server/.env.example`) y agrega también `JWT_SECRET`,
`MONGODB_URI` y `MONGODB_DB`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Luego arranca el servidor:

```bash
npm start
```

El backend escucha en `http://localhost:4000` y guarda los datos en MongoDB
mediante `MONGODB_URI`.

Si ya tienes datos en el SQLite anterior, configura `MONGODB_URI` y ejecuta una
sola vez desde la raíz:

```bash
npm run migrate --prefix server
```

El comando conserva los IDs y relaciones de clientes y fletes.

**2. Frontend**

En otra terminal, desde la raíz del proyecto:

```bash
npm install
npm run dev
```

El frontend usa `VITE_API_URL=http://localhost:4000/api` en `.env`, así que
se comunica con el backend local. Abre `http://localhost:5173`, inicia sesión
con la contraseña que definiste y ya puedes agregar clientes y fletes.

También puedes levantar ambos procesos desde la raíz:

```bash
npm run start:all
```

## Pruebas y documentación de entrega

Ejecuta las pruebas automatizadas y el build de producción:

```bash
npm test
npm run build
```

- Requisitos y diagrama: `REQUERIMIENTOS.md`
- Manual breve de usuario: `MANUAL-USUARIO.md`
- Evidencias de pruebas y despliegue: `EVIDENCIAS.md`
- CI en GitHub Actions: `.github/workflows/ci.yml`

## Docker

Genera las variables obligatorias y levanta la aplicación completa:

```bash
cd server
node generate-hash.js "tu-password-de-al-menos-8-caracteres"
cd ..
export APP_PASSWORD_HASH="el-hash-generado"
export JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
export MONGODB_URI="mongodb+srv://usuario:password@cluster.mongodb.net/?retryWrites=true&w=majority"
export MONGODB_DB="freightbd"
docker compose up --build -d
```

Abre `http://localhost:8080`. Los datos se guardan en MongoDB Atlas. Para detener los servicios:

```bash
docker compose down
```

## Seguridad

- Acceso protegido por contraseña (hash bcrypt) + tokens JWT de 12 horas.
- Límite de intentos de login (8 cada 15 min) para frenar fuerza bruta.
- Límite general de peticiones por IP.
- Validación estricta en el backend de cada campo (nombre, empresa, material,
  unidad, cantidad, precio, fecha) — nunca se confía en lo que mande el
  frontend, aunque el frontend también valide para dar feedback inmediato.
- Cabeceras de seguridad HTTP vía `helmet`.
- CORS restringido a orígenes configurables (`ALLOWED_ORIGINS`).
- Consulta Open-Meteo mediante `GET /api/weather` para mostrar el clima de
    referencia de Ciudad de México; si el servicio falla, el resto de la
    aplicación continúa disponible.

## Persistencia de datos

El backend guarda clientes y fletes en MongoDB Atlas. Configura `MONGODB_URI`
y `MONGODB_DB` en `server/.env` o en las variables del servicio de despliegue.
La base ya no depende del disco local ni del almacenamiento efímero de una
función serverless.

## Despliegue

Ver `guia-despliegue-freightbd.md` para el paso a paso completo de Vercel,
MongoDB Atlas y dominio propio.
