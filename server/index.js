require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, param, validationResult } = require('express-validator');
const {
  connectDB,
  closeDB,
  obtenerClientes,
  crearCliente,
  eliminarCliente,
  crearFlete,
  eliminarFlete
} = require('./db');
const { obtenerClima } = require('./weather');

const app = express();
const PORT = process.env.PORT || 4000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_BLOCK_MS = 60 * 60 * 1000;
const PASSWORD_STORE_PATH = process.env.PASSWORD_STORE_PATH || path.join(__dirname, 'password-store.json');
const loginAttemptStore = new Map();

function readPasswordStore() {
  try {
    const raw = fs.readFileSync(PASSWORD_STORE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    const seed = {
      appPasswordHash: process.env.APP_PASSWORD_HASH || '',
      adminUsername: process.env.ADMIN_USERNAME || 'admin',
      adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin123!', 12),
      bypassTokens: []
    };
    fs.writeFileSync(PASSWORD_STORE_PATH, JSON.stringify(seed, null, 2));
    return seed;
  }
}

function persistPasswordStore() {
  fs.writeFileSync(PASSWORD_STORE_PATH, JSON.stringify({
    appPasswordHash: APP_PASSWORD_HASH,
    adminUsername: ADMIN_USERNAME,
    adminPasswordHash: ADMIN_PASSWORD_HASH,
    bypassTokens: bypassTokens.filter((token) => token.expiresAt > Date.now())
  }, null, 2));
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function findValidBypassTokenIndex(token) {
  if (!token || !String(token).trim()) return -1;
  const tokenHash = hashToken(token);
  const ahora = Date.now();
  return bypassTokens.findIndex((entry) => entry.tokenHash === tokenHash && entry.expiresAt > ahora);
}

function consumeBypassToken(token) {
  const indice = findValidBypassTokenIndex(token);
  if (indice === -1) return false;
  bypassTokens.splice(indice, 1);
  persistPasswordStore();
  return true;
}

function isBypassTokenValid(token) {
  return consumeBypassToken(token);
}

function hasValidBypassToken(token) {
  return findValidBypassTokenIndex(token) !== -1;
}

function getClientKey(req) {
  const forwarded = req.headers['x-forwarded-for'];
  return (forwarded ? forwarded.split(',')[0].trim() : req.ip) || 'unknown';
}

function getAttemptState(ip) {
  const state = loginAttemptStore.get(ip);
  if (!state) return null;
  if (state.blockedUntil && Date.now() > state.blockedUntil) {
    loginAttemptStore.delete(ip);
    return null;
  }
  return state;
}

function marcarIntentoFallido(ip) {
  const ahora = Date.now();
  const actual = loginAttemptStore.get(ip) || { count: 0, blockedUntil: 0 };
  actual.count += 1;
  if (actual.count >= MAX_LOGIN_ATTEMPTS) {
    actual.blockedUntil = ahora + LOGIN_BLOCK_MS;
  }
  loginAttemptStore.set(ip, actual);
  return actual;
}

const passwordStore = readPasswordStore();
let APP_PASSWORD_HASH = passwordStore.appPasswordHash;
let ADMIN_USERNAME = passwordStore.adminUsername || 'admin';
let ADMIN_PASSWORD_HASH = passwordStore.adminPasswordHash || bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin123!', 12);
let bypassTokens = Array.isArray(passwordStore.bypassTokens) ? passwordStore.bypassTokens : [];

// ---------------------------------------------------------------------------
// Configuración y secretos: define estas variables en Vercel o en server/.env.
// APP_PASSWORD_HASH se genera con `node generate-hash.js "tu-password"`.
// JWT_SECRET puede ser cualquier cadena larga aleatoria (ej. openssl rand -hex 32).
// ---------------------------------------------------------------------------
const JWT_SECRET = process.env.JWT_SECRET;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!APP_PASSWORD_HASH || !JWT_SECRET) {
  console.error(
    '❌ Faltan variables de entorno obligatorias: APP_PASSWORD_HASH y/o JWT_SECRET.\n' +
    '   Genera el hash con: node generate-hash.js "tu-password"\n' +
    '   Genera un secreto con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Seguridad de transporte / cabeceras
// ---------------------------------------------------------------------------
app.set('trust proxy', 1); // Vercel está detrás de un proxy; necesario para rate-limit e IPs correctas
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  }
}));
app.use(express.json({ limit: '15kb' })); // payloads pequeños: este endpoint nunca necesita más

app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// Rate limiting: general + uno estricto para el login (evita fuerza bruta)
// ---------------------------------------------------------------------------
const limiteGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' }
});

const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const token = req.body && req.body.bypassToken;
    const valido = hasValidBypassToken(token);
    if (valido) {
      req.bypassValido = true;
    }
    return valido;
  },
  message: { error: 'Demasiados intentos de acceso. Intenta de nuevo en 15 minutos.' }
});

app.use(limiteGeneral);

app.get('/api/ping', (req, res) => res.json({ ok: true }));

// ---------------------------------------------------------------------------
// Autenticación: una sola contraseña compartida (dashboard interno de un solo
// operador), pero con hash bcrypt + JWT de corta duración en vez de contraseña
// en texto plano viajando en cada request.
// ---------------------------------------------------------------------------
app.post(
  '/api/auth/login',
  limiteLogin,
  body('bypassToken').optional({ values: 'falsy' }).isString().isLength({ min: 1, max: 200 }),
  (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ error: 'Token o contraseña inválidos.' });
    }

    const { password, bypassToken } = req.body || {};
    if ((!password || !String(password).trim()) && !bypassToken) {
      return res.status(400).json({ error: 'Contraseña requerida' });
    }

    const ip = getClientKey(req);
    const intentoActual = getAttemptState(ip);
    const tokenV = !!bypassToken && hasValidBypassToken(bypassToken);
    const bypassValido = req.bypassValido === true || tokenV;

    if (intentoActual && intentoActual.blockedUntil && Date.now() < intentoActual.blockedUntil && !bypassValido) {
      const remainingSeconds = Math.max(1, Math.ceil((intentoActual.blockedUntil - Date.now()) / 1000));
      return res.status(429).json({
        error: 'Demasiados intentos. Espera 1 hora o usa un token de administrador.',
        remainingSeconds
      });
    }

    const valido = !!password && bcrypt.compareSync(String(password), APP_PASSWORD_HASH);

    if (!valido && !tokenV) {
      const intento = marcarIntentoFallido(ip);
      if (intento.count >= MAX_LOGIN_ATTEMPTS) {
        const remainingSeconds = Math.max(1, Math.ceil((intento.blockedUntil - Date.now()) / 1000));
        return res.status(429).json({
          error: 'Demasiados intentos. Espera 1 hora o usa un token de administrador.',
          remainingSeconds
        });
      }
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    if (tokenV) {
      consumeBypassToken(bypassToken);
    }

    loginAttemptStore.delete(ip);
    const token = jwt.sign({ auth: true }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, expiresIn: 12 * 60 * 60 });
  }
);

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

function requireAdminAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Se requiere acceso de administrador' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

// ---------------------------------------------------------------------------
// Rutas de administración
// ---------------------------------------------------------------------------
app.post(
  '/api/admin/login',
  body('username').isString().trim().notEmpty(),
  body('password').isString().trim().notEmpty(),
  (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ error: 'Usuario y contraseña de administrador requeridos.' });
    }

    const { username, password } = req.body;
    if (username !== ADMIN_USERNAME) {
      return res.status(401).json({ error: 'Credenciales de administrador inválidas.' });
    }

    if (!bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
      return res.status(401).json({ error: 'Contraseña de administrador incorrecta.' });
    }

    const token = jwt.sign({ role: 'admin', username: ADMIN_USERNAME }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, expiresIn: 12 * 60 * 60 });
  }
);

app.post(
  '/api/admin/bypass-token',
  requireAdminAuth,
  (req, res) => {
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + LOGIN_BLOCK_MS;
    bypassTokens.push({ tokenHash: hashToken(token), expiresAt });
    persistPasswordStore();
    res.json({ token, expiresIn: Math.ceil((expiresAt - Date.now()) / 1000) });
  }
);

app.post(
  '/api/admin/password',
  requireAdminAuth,
  body('newPassword').isString().isLength({ min: 8, max: 200 }),
  (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
    }

    const { newPassword } = req.body;
    APP_PASSWORD_HASH = bcrypt.hashSync(newPassword, 12);
    persistPasswordStore();
    loginAttemptStore.clear();
    res.json({ message: 'Contraseña del dashboard actualizada correctamente.' });
  }
);

// ---------------------------------------------------------------------------
// Reglas de validación reutilizables. Todo lo que llega del cliente se
// valida y se limpia (trim + escape) antes de tocar el disco: nunca se
// confía en lo que mande el frontend, aunque el frontend también valide.
// ---------------------------------------------------------------------------
const MATERIALES_VALIDOS = ['Arena', 'Grava', 'Rajuela', 'Ladrillo', 'Escombro'];
const UNIDADES_VALIDAS = ['Unidades', 'm³', 'm²', 'Viajes'];

const validarId = (campo) =>
  param(campo).isString().matches(/^[a-f0-9-]{8,36}$/i).withMessage('Identificador inválido');

const manejarErroresValidacion = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ error: errores.array()[0].msg });
  }
  next();
};

// ---------------------------------------------------------------------------
// Rutas protegidas
// ---------------------------------------------------------------------------

// [GET] Obtener clientes
app.get('/api/clientes', requireAuth, async (req, res) => {
  res.json(await obtenerClientes());
});

app.get('/api/weather', requireAuth, async (req, res) => {
  try {
    res.json(await obtenerClima());
  } catch (error) {
    console.error('No se pudo consultar Open-Meteo:', error.message);
    res.status(503).json({ error: 'El servicio meteorológico no está disponible.' });
  }
});

// [POST] Crear Cliente
app.post(
  '/api/clientes',
  requireAuth,
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .customSanitizer((v) => v.replace(/[<>]/g, '')),
  body('empresa')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 150 }).withMessage('La empresa no puede superar 150 caracteres')
    .customSanitizer((v) => (v ? v.replace(/[<>]/g, '') : v)),
  manejarErroresValidacion,
  async (req, res) => {
    const { nombre, empresa } = req.body;

    res.status(201).json(await crearCliente({ nombre, empresa }));
  }
);

// [DELETE] Eliminar un cliente por completo
app.delete(
  '/api/clientes/:id',
  requireAuth,
  validarId('id'),
  manejarErroresValidacion,
  async (req, res) => {
    const idBuscar = String(req.params.id);
    const eliminado = await eliminarCliente(idBuscar);
    if (!eliminado) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ message: 'Cliente eliminado correctamente' });
  }
);

// [POST] Agregar Flete
app.post(
  '/api/clientes/:id/fletes',
  requireAuth,
  validarId('id'),
  body('tipoMaterial').isString().trim().isIn(MATERIALES_VALIDOS).withMessage('Material no válido'),
  body('unidadMedida').isString().trim().isIn(UNIDADES_VALIDAS).withMessage('Unidad de medida no válida'),
  body('cantidad')
    .isFloat({ gt: 0, lt: 1000000 }).withMessage('La cantidad debe ser un número mayor a 0'),
  body('precio')
    .isFloat({ gt: 0, lt: 10000000 }).withMessage('El precio debe ser un número mayor a 0'),
  body('fecha')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('Fecha inválida')
    .toDate(),
  manejarErroresValidacion,
  async (req, res) => {
    const { id } = req.params;
    const { tipoMaterial, unidadMedida, cantidad, precio } = req.body;

    const cliente = await crearFlete(id, {
      tipoMaterial,
      unidadMedida,
      cantidad,
      precio,
      fecha: req.body.fecha
    });

    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.status(201).json(cliente);
  }
);

// [DELETE] Eliminar un flete específico
app.delete(
  '/api/clientes/:clienteId/fletes/:fleteId',
  requireAuth,
  validarId('clienteId'),
  validarId('fleteId'),
  manejarErroresValidacion,
  async (req, res) => {
    const idCliente = String(req.params.clienteId);
    const idFlete = String(req.params.fleteId);

    const resultado = await eliminarFlete(idCliente, idFlete);
    if (resultado.estado === 'cliente-no-encontrado') {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    if (resultado.estado === 'flete-no-encontrado') {
      return res.status(404).json({ error: 'Flete no encontrado' });
    }

    res.json(resultado.cliente);
  }
);

// ---------------------------------------------------------------------------
// 404 + manejador de errores centralizado (nunca se filtran stack traces)
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

async function startServer() {
  await connectDB();
  const server = app.listen(PORT, () => {
    console.log(`Servidor FreightBD corriendo en el puerto ${PORT}`);
    console.log(`Base de datos MongoDB: ${process.env.MONGODB_DB || 'freightbd'}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await closeDB();
      process.exit(0);
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(`No se pudo iniciar el servidor: ${error.message}`);
    process.exit(1);
  });
}

module.exports = app;
