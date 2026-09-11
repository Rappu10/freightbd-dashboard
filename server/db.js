const crypto = require('crypto');
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'freightbd';
let client;
let database;

async function connectDB() {
  if (database) return database;
  if (!MONGODB_URI) {
    throw new Error('Falta la variable de entorno MONGODB_URI. Configúrala con la conexión de MongoDB Atlas.');
  }

  client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  database = client.db(MONGODB_DB);
  await database.collection('clientes').createIndex({ creado_en: -1 });
  await database.collection('fletes').createIndex({ cliente_id: 1, fecha: -1, creado_en: -1 });
  return database;
}

async function closeDB() {
  if (client) await client.close();
  client = undefined;
  database = undefined;
}

function getCollections() {
  if (!database) throw new Error('La base de datos no está conectada.');
  return {
    clientes: database.collection('clientes'),
    fletes: database.collection('fletes')
  };
}

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

async function obtenerClientes() {
  const { clientes, fletes } = getCollections();
  const clientesRows = await clientes.find({}).sort({ creado_en: -1 }).toArray();
  const fletesRows = await fletes.find({}).sort({ fecha: -1, creado_en: -1 }).toArray();
  const fletesPorCliente = fletesRows.reduce((acc, flete) => {
    if (!acc[flete.cliente_id]) acc[flete.cliente_id] = [];
    acc[flete.cliente_id].push(mapFlete(flete));
    return acc;
  }, {});

  return clientesRows.map((cliente) => mapCliente(cliente, fletesPorCliente[cliente.id] || []));
}

async function obtenerClientePorId(id) {
  const { clientes, fletes } = getCollections();
  const cliente = await clientes.findOne({ id });
  if (!cliente) return null;

  const registros = await fletes.find({ cliente_id: id }).sort({ fecha: -1, creado_en: -1 }).toArray();
  return mapCliente(cliente, registros.map(mapFlete));
}

async function crearCliente({ nombre, empresa }) {
  const ahora = new Date().toISOString();
  const cliente = {
    id: crypto.randomUUID(),
    nombre,
    empresa: empresa || 'Particular',
    creado_en: ahora
  };

  const { clientes } = getCollections();
  await clientes.insertOne(cliente);
  return mapCliente(cliente, []);
}

async function eliminarCliente(id) {
  const { clientes, fletes } = getCollections();
  const result = await clientes.deleteOne({ id });
  if (result.deletedCount > 0) await fletes.deleteMany({ cliente_id: id });
  return result.deletedCount > 0;
}

async function crearFlete(clienteId, { tipoMaterial, unidadMedida, cantidad, precio, fecha }) {
  const ahora = new Date().toISOString();
  const fechaNormalizada = fecha
    ? new Date(fecha).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  const { clientes, fletes } = getCollections();
  const cliente = await clientes.findOne({ id: clienteId }, { projection: { _id: 1 } });
  if (!cliente) return null;

  await fletes.insertOne({
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

async function eliminarFlete(clienteId, fleteId) {
  const { clientes, fletes } = getCollections();
  const cliente = await clientes.findOne({ id: clienteId }, { projection: { _id: 1 } });
  if (!cliente) return { estado: 'cliente-no-encontrado' };

  const result = await fletes.deleteOne({ id: fleteId, cliente_id: clienteId });
  if (result.deletedCount === 0) return { estado: 'flete-no-encontrado' };
  return { estado: 'ok', cliente: await obtenerClientePorId(clienteId) };
}

module.exports = {
  connectDB,
  closeDB,
  obtenerClientes,
  crearCliente,
  eliminarCliente,
  crearFlete,
  eliminarFlete
};
