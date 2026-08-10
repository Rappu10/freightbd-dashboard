# Guía de despliegue — FreightBD Dashboard con dominio propio

Backend en **Render**, frontend en **Vercel** (mismo esquema que PetroArte).

---

## 1. Sube el proyecto a GitHub

Desde la carpeta del proyecto (la que descargaste, ya con los cambios):

```bash
cd freightbd-dashboard
git init
git add .
git commit -m "Preparado para deploy"
```

Crea un repo nuevo en https://github.com/new (por ejemplo `freightbd-dashboard`), sin inicializarlo con README. Luego:

```bash
git remote add origin https://github.com/TU-USUARIO/freightbd-dashboard.git
git branch -M main
git push -u origin main
```

Verifica que exista un `.gitignore` con `node_modules/` (ya lo tiene) para no subir las dependencias.

---

## 2. Despliega el backend en Render

1. Entra a https://dashboard.render.com y haz clic en **New +** → **Web Service**.
2. Conecta tu cuenta de GitHub si no lo has hecho, y selecciona el repo `freightbd-dashboard`.
3. Configura:
   - **Name**: `freightbd-server` (o el que prefieras, define la URL: `freightbd-server.onrender.com`)
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (para pruebas) o el plan pago si quieres disco persistente
4. Antes de crear el servicio, baja a **Environment Variables** y agrega:
   - `ALLOWED_ORIGIN` = `https://freightbd-dashboard.vercel.app` (por ahora pon la URL que Vercel te va a dar en el paso 3; la puedes editar después)
   - `APP_PASSWORD_HASH` = el resultado de correr localmente `node generate-hash.js "tu-password"` dentro de `server/`
   - `JWT_SECRET` = un valor aleatorio largo, generado con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

   El dashboard ahora pide contraseña para entrar (login con hash bcrypt + sesión JWT de 12h), así que estas dos variables son obligatorias — el servidor no arranca sin ellas.
5. Clic en **Create Web Service**. Render va a instalar dependencias y arrancar el servidor. Tarda 2-5 min.
6. Cuando termine, copia la URL pública que te da, algo como `https://freightbd-server.onrender.com`.
7. Pruébala abriendo en el navegador `https://freightbd-server.onrender.com/api/ping` — debe responder `{"ok":true}`.

**Nota:** en el plan free, Render "duerme" el servicio tras 15 min sin tráfico, y la primera petición después tarda ~30-50 seg en responder mientras despierta. Es normal.

---

## 3. Despliega el frontend en Vercel

1. Entra a https://vercel.com/new y selecciona el mismo repo de GitHub.
2. Configura:
   - **Root Directory**: la raíz del proyecto (deja el default, no selecciones `server`)
   - **Framework Preset**: Vite (debería detectarlo solo)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. En **Environment Variables**, agrega:
   - `VITE_API_URL` = `https://freightbd-server.onrender.com/api` (la URL de Render del paso 2, con `/api` al final)
4. Clic en **Deploy**. Tarda 1-2 min.
5. Al terminar, Vercel te da una URL tipo `https://freightbd-dashboard.vercel.app`. Ábrela y prueba crear un cliente — si el backend responde, ya está conectado.

Si en este punto la app no carga clientes, revisa la consola del navegador (F12): si ves un error de CORS, es porque `ALLOWED_ORIGIN` en Render no coincide exactamente con la URL de Vercel. Corrígelo en Render → Environment → guarda → el servicio se reinicia solo.

---

## 4. Conecta tu dominio propio en Vercel

1. En el proyecto de Vercel: **Settings** → **Domains** → escribe tu dominio (ej. `freightbd.com` o `dashboard.freightbd.com`) → **Add**.
2. Vercel te muestra los registros DNS que necesitas. Normalmente:
   - Para dominio raíz (`freightbd.com`): un registro **A** apuntando a `76.76.21.21`
   - Para subdominio (`dashboard.freightbd.com`): un registro **CNAME** apuntando a `cname.vercel-dns.com`
3. Entra al panel de tu proveedor de dominio (GoDaddy, Namecheap, Hostinger, donde lo hayas comprado) → sección DNS/Nameservers → agrega el registro exacto que te dio Vercel.
4. Vuelve a Vercel y espera a que el estado del dominio pase de "Pending" a "Valid" (puede tardar de minutos a un par de horas por la propagación DNS). Vercel emite el certificado SSL (https) automáticamente, no tienes que hacer nada extra.

---

## 5. (Opcional) Dominio también para el backend

Si quieres algo como `api.freightbd.com` en vez de la URL de onrender.com:

1. En Render, dentro de tu Web Service: **Settings** → **Custom Domain** → agrega `api.freightbd.com`.
2. Te da un registro **CNAME** para agregar en tu proveedor de DNS, igual que en el paso 4.
3. Una vez validado, actualiza `VITE_API_URL` en Vercel a `https://api.freightbd.com/api` y vuelve a desplegar (Deployments → los tres puntos → Redeploy).

Esto es puramente estético/profesional — con la URL de onrender.com funciona exactamente igual.

---

## 6. Ajuste final de CORS

Cuando ya tengas el dominio definitivo del frontend funcionando:

1. Ve a Render → tu servicio → **Environment**.
2. Actualiza `ALLOWED_ORIGIN` al dominio final (ej. `https://freightbd.com`, sin slash al final).
3. Guarda — Render redeploya solo.
4. Abre tu dominio y prueba crear/eliminar un cliente y un flete para confirmar que todo responde.

---

## Problema importante: pérdida de datos

El backend guarda todo en `server/data.json`, un archivo en disco. En el plan **free** de Render, el disco es efímero: cada redeploy o reinicio del servicio borra ese archivo y vuelves a cero.

Opciones si esto te importa (para un cliente real, sí importa):

- **Render Disk** (plan pago, ~$1/mes por 1GB): monta un disco persistente en `/server` para que `data.json` sobreviva reinicios.
- **Migrar a MongoDB Atlas** (como hiciste en PetroArte): más robusto, gratis en el tier free de Atlas, y no dependes del disco de Render.

Si quieres, te ayudo a hacer esa migración a MongoDB Atlas — es la opción que yo recomendaría si esto va a producción con clientes reales.
