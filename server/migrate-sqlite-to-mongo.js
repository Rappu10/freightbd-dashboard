require('dotenv').config();

const path = require('path');
const Database = require('better-sqlite3');
const { connectDB, closeDB } = require('./db');

async function migrate() {
  const sqlitePath = path.resolve(process.env.SQLITE_FILE || path.join(__dirname, 'data.sqlite'));
  const sqlite = new Database(sqlitePath, { readonly: true });
  const database = await connectDB();
  const clientes = database.collection('clientes');
  const fletes = database.collection('fletes');

  const clientesRows = sqlite.prepare('SELECT id, nombre, empresa, creado_en FROM clientes').all();
  const fletesRows = sqlite.prepare(
    'SELECT id, cliente_id, tipo_material, cantidad, precio, fecha, creado_en FROM fletes'
  ).all();

  if (clientesRows.length > 0) {
    await clientes.bulkWrite(clientesRows.map((cliente) => ({
      updateOne: { filter: { id: cliente.id }, update: { $set: cliente }, upsert: true }
    })));
  }
  if (fletesRows.length > 0) {
    await fletes.bulkWrite(fletesRows.map((flete) => ({
      updateOne: { filter: { id: flete.id }, update: { $set: flete }, upsert: true }
    })));
  }

  sqlite.close();
  await closeDB();
  console.log(`Migrados ${clientesRows.length} clientes y ${fletesRows.length} fletes a MongoDB.`);
}

migrate().catch(async (error) => {
  console.error(`No se pudo completar la migración: ${error.message}`);
  await closeDB();
  process.exit(1);
});