const mysql = require("mysql2");
const dotenv = require("dotenv");

//Carga de variables .ENV
dotenv.config();


//Conexión a BD
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("Error al conectar a la DB:", err);
  } else {
    console.log("Conectado a la base de datos MySQL");
  }
});

module.exports = db;
