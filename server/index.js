require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, param, validationResult } = require('express-validator');
const {
  DB_FILE,
  obtenerClientes,
  crearCliente,
  eliminarCliente,
  crearFlete,
  eliminarFlete
} = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

// ---------------------------------------------------------------------------
// Config / secretos. En Render: Settings > Environment Variables.
// APP_PASSWORD_HASH se genera con `node generate-hash.js "tu-password"`.
// JWT_SECRET puede ser cualquier cadena larga aleatoria (ej. openssl rand -hex 32).
// ---------------------------------------------------------------------------
const APP_PASSWORD_HASH = process.env.APP_PASSWORD_HASH;
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
app.set('trust proxy', 1); // Render está detrás de un proxy; necesario para rate-limit e IPs correctas
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
  body('password').isString().isLength({ min: 1, max: 200 }),
  (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ error: 'Contraseña requerida' });
    }

    const { password } = req.body;
    const valido = bcrypt.compareSync(password, APP_PASSWORD_HASH);

    if (!valido) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

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
app.get('/api/clientes', requireAuth, (req, res) => {
  res.json(obtenerClientes());
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
  (req, res) => {
    const { nombre, empresa } = req.body;

    res.status(201).json(crearCliente({ nombre, empresa }));
  }
);

// [DELETE] Eliminar un cliente por completo
app.delete(
  '/api/clientes/:id',
  requireAuth,
  validarId('id'),
  manejarErroresValidacion,
  (req, res) => {
    const idBuscar = String(req.params.id);
    const eliminado = eliminarCliente(idBuscar);
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
  (req, res) => {
    const { id } = req.params;
    const { tipoMaterial, unidadMedida, cantidad, precio } = req.body;

    const cliente = crearFlete(id, {
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
  (req, res) => {
    const idCliente = String(req.params.clienteId);
    const idFlete = String(req.params.fleteId);

    const resultado = eliminarFlete(idCliente, idFlete);
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

app.listen(PORT, () => {
  console.log(`🚀 Servidor FreightBD corriendo en el puerto ${PORT}`);
  console.log(`📦 Base de datos local: ${DB_FILE}`);
});
