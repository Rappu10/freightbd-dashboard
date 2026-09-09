# FreightBD Dashboard

Panel para llevar el control de clientes y sus fletes de material (arena,
grava, rajuela, ladrillo, escombro). Frontend en React + Vite + Tailwind,
backend en Express con autenticación por contraseña y base de datos local
SQLite.

## Desarrollo local

**1. Backend**

```bash
cd server
npm install
node generate-hash.js "tu-password-de-al-menos-8-caracteres"
```

Copia el `APP_PASSWORD_HASH` que te imprime, crea un archivo `server/.env`
(a partir de `server/.env.example`) y pégalo ahí junto con un `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Luego arranca el servidor:

```bash
npm start
```

El backend escucha en `http://localhost:4000` y usa `server/data.sqlite`
como base de datos local.

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
docker compose up --build -d
```

Abre `http://localhost:8080`. La base SQLite y el almacén de credenciales
persisten en el volumen Docker `freightbd_data`. Para detener los servicios:

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

## Persistencia de datos local

El backend guarda todo en `server/data.sqlite`. En local los datos sobreviven
mientras no borres ese archivo. En el plan free de Render el disco es efímero:
cada redeploy o reinicio puede borrar la base si no configuras disco
persistente. Si esto va a producción con clientes reales, considera un disco
persistente de Render o migrar a una base de datos administrada.

## Despliegue

Ver `guia-despliegue-freightbd.md` para el paso a paso completo (Render +
Vercel + dominio propio).
