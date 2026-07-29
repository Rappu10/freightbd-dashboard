# FreightBD Dashboard (scaffold)

Proyecto minimal con Vite + React + Tailwind para gestionar clientes y sus fletes.

Comandos:

```bash
npm install
npm run dev
```

Esto guarda datos en `localStorage` bajo la clave `freightbd_data`.

Backend:

En la carpeta `server` hay un servidor Express con SQLite.

Para ejecutarlo:

```bash
cd server
npm install
npm start
```

El frontend intentará usar el backend en `/api/*` si está disponible, si no, usará `localStorage`.
 
Si quieres arrancar frontend y backend juntos:

```bash
npm install
npm run start:all
```

Esto lanza el servidor SQLite en `server` y el frontend Vite en paralelo.
