const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbFile = path.join(__dirname, 'data.sqlite')
const db = new sqlite3.Database(dbFile)

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    )`
  )

  db.run(
    `CREATE TABLE IF NOT EXISTS freights (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      material TEXT,
      quantity REAL,
      price REAL,
      FOREIGN KEY(client_id) REFERENCES clients(id)
    )`
  )
})

module.exports = db
