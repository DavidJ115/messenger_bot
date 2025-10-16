const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");
require("dotenv").config();

router.post("/enviar-crm", async (req, res) => {
  const formData = req.body.data;
  if (!Array.isArray(formData) || formData.length === 0)
    return res.status(400).json({ error: "No hay datos para enviar." });

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST2,
      user: process.env.DB_USER2,
      password: process.env.DB_PASSWORD2,
      database: process.env.DB_NAME2,
      charset: process.env.DB_CHARSET || "utf8mb4",
    });

    for (const row of formData) {
      const nombre = row.nombre || "Sin Nombre";
      const departamento = row.departamento || "";
      const telefono = (row.telefono || "").replace(/[\s-]/g, "");
      if (!telefono) continue;

      // Manejar fecha: si viene inválida o null, usar fecha actual
      let fecha;
      if (row.fecha) {
        const temp = new Date(row.fecha);
        fecha = isNaN(temp) ? new Date() : temp;
      } else {
        fecha = new Date();
      }
      // Formato MySQL: YYYY-MM-DD HH:MM:SS
      const fechaStr = fecha.toISOString().slice(0, 19).replace("T", " ");

      // Insert Prospecto
      const [insertResult] = await connection.execute(
        `INSERT INTO Prospectos (nombre_completo, numero_celular, ciudad, fecha_creacion, asesor_id)
         VALUES (?, ?, ?, ?, ?)`,
        [nombre, telefono, departamento, fechaStr, 1]
      );

      const [rows] = await connection.execute("SELECT LAST_INSERT_ID() as id");
      const idProspecto = rows[0].id;

      // Insert Timeline
      await connection.execute(
        `INSERT INTO timeline (event_name, event_date, user_id, prospect_id, avatar_path, user_comment, user_name, user_position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          "Actualización de Prospecto",
          fechaStr,
          1,
          idProspecto,
          "bot.png",
          "Se Creó Prospecto",
          "Bot Naranja 🍊",
          "Dashboard",
        ]
      );
    }

    res.json({ success: true, message: "Datos enviados correctamente." });
  } catch (err) {
    console.error("Error enviando a CRM:", err);
    res.status(500).json({ error: "Error al enviar al CRM." });
  } finally {
    if (connection) await connection.end();
  }
});

module.exports = router;
