const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const DB_FILE = process.env.DB_FILE
  ? path.resolve(__dirname, process.env.DB_FILE)
  : path.join(__dirname, 'data.sqlite');
const db = new Database(DB_FILE);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS clientes (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    empresa TEXT NOT NULL DEFAULT 'Particular',
    creado_en TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS fletes (
    id TEXT PRIMARY KEY,
    cliente_id TEXT NOT NULL,
    tipo_material TEXT NOT NULL,
    cantidad REAL NOT NULL,
    precio REAL NOT NULL,
    fecha TEXT NOT NULL,
    creado_en TEXT NOT NULL,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_fletes_cliente_id ON fletes(cliente_id);
`);

const mapFlete = (row) => ({
  id: row.id,
  tipoMaterial: row.tipo_material,
  cantidad: row.cantidad,
  precio: row.precio,
  fecha: row.fecha
});

const mapCliente = (row, fletes = []) => ({
  id: row.id,
  nombre: row.nombre,
  empresa: row.empresa,
  fletes,
  totalFinal: fletes.reduce((sum, flete) => sum + (Number(flete.precio) || 0), 0),
  creadoEn: row.creado_en
});

function obtenerClientes() {
  const clientes = db.prepare('SELECT * FROM clientes ORDER BY creado_en DESC').all();
  const fletesPorCliente = db
    .prepare('SELECT * FROM fletes ORDER BY fecha DESC, creado_en DESC')
    .all()
    .reduce((acc, flete) => {
      if (!acc[flete.cliente_id]) acc[flete.cliente_id] = [];
      acc[flete.cliente_id].push(mapFlete(flete));
      return acc;
    }, {});

  return clientes.map((cliente) => mapCliente(cliente, fletesPorCliente[cliente.id] || []));
}

function obtenerClientePorId(id) {
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(id);
  if (!cliente) return null;

  const fletes = db
    .prepare('SELECT * FROM fletes WHERE cliente_id = ? ORDER BY fecha DESC, creado_en DESC')
    .all(id)
    .map(mapFlete);

  return mapCliente(cliente, fletes);
}

function crearCliente({ nombre, empresa }) {
  const ahora = new Date().toISOString();
  const cliente = {
    id: crypto.randomUUID(),
    nombre,
    empresa: empresa || 'Particular',
    creado_en: ahora
  };

  db.prepare(
    'INSERT INTO clientes (id, nombre, empresa, creado_en) VALUES (@id, @nombre, @empresa, @creado_en)'
  ).run(cliente);

  return mapCliente(cliente, []);
}

function eliminarCliente(id) {
  const result = db.prepare('DELETE FROM clientes WHERE id = ?').run(id);
  return result.changes > 0;
}

function crearFlete(clienteId, { tipoMaterial, unidadMedida, cantidad, precio, fecha }) {
  const cliente = db.prepare('SELECT id FROM clientes WHERE id = ?').get(clienteId);
  if (!cliente) return null;

  const ahora = new Date().toISOString();
  const fechaNormalizada = fecha
    ? new Date(fecha).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  db.prepare(`
    INSERT INTO fletes (id, cliente_id, tipo_material, cantidad, precio, fecha, creado_en)
    VALUES (@id, @cliente_id, @tipo_material, @cantidad, @precio, @fecha, @creado_en)
  `).run({
    id: crypto.randomUUID(),
    cliente_id: clienteId,
    tipo_material: `${tipoMaterial} (${unidadMedida})`,
    cantidad: Number(cantidad),
    precio: Number(precio),
    fecha: fechaNormalizada,
    creado_en: ahora
  });

  return obtenerClientePorId(clienteId);
}

function eliminarFlete(clienteId, fleteId) {
  const cliente = db.prepare('SELECT id FROM clientes WHERE id = ?').get(clienteId);
  if (!cliente) return { estado: 'cliente-no-encontrado' };

  const result = db
    .prepare('DELETE FROM fletes WHERE id = ? AND cliente_id = ?')
    .run(fleteId, clienteId);

  if (result.changes === 0) return { estado: 'flete-no-encontrado' };
  return { estado: 'ok', cliente: obtenerClientePorId(clienteId) };
}

module.exports = {
  DB_FILE,
  obtenerClientes,
  crearCliente,
  eliminarCliente,
  crearFlete,
  eliminarFlete
};
