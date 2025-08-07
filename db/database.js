require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};

// Código anterior para SQLite (comentado):

// const sqlite3 = require('sqlite3').verbose();
// const path = require('path');

// const dbPath = path.resolve(__dirname, '../eco_market.db');
// const db = new sqlite3.Database(dbPath, (err) => {
//     if (err) {
//         console.error('Error al conectar con la base de datos:', err);
//     } else {
//         console.log('Conectado a la base de datos SQLite.');
//     }
// });

// module.exports = db;

