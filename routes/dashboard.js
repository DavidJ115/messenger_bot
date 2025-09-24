const express = require("express");
const router = express.Router();
const db = require("../db");

// Obtener mensajes
router.get("/api/mensajes", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 25;
  const offset = (page - 1) * limit;

  // Contar total de mensajes
  db.query("SELECT COUNT(*) AS total FROM mensajes", (err, countResult) => {
    if (err) return res.status(500).json({ error: err });

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    // Traer mensajes paginados
    db.query(
      "SELECT * FROM mensajes ORDER BY id DESC LIMIT ? OFFSET ?",
      [limit, offset],
      (err, results) => {
        if (err) return res.status(500).json({ error: err });

        res.json({
          data: results,
          total,
          page,
          totalPages
        });
      }
    );
  });
});

// Obtener contactos
router.get("/api/contactos", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 25;
  const offset = (page - 1) * limit;

  // Filtros recibidos desde frontend
  const departamento = req.query.departamento ? req.query.departamento.trim() : "";
  const fechaInicio = req.query.fecha_inicio ? req.query.fecha_inicio.trim() : "";
  const fechaFin = req.query.fecha_fin ? req.query.fecha_fin.trim() : "";

  // Construir WHERE dinámico y parámetros (parámetros en orden)
  const where = [];
  const params = [];

  if (departamento) {
    // Usamos COLLATE para comparar sin distinción de tildes/mayúsculas si tu collation lo soporta
    // Ajusta a 'utf8mb4_unicode_ci' o la colación que uses si fuese necesario
    where.push("departamento COLLATE utf8mb4_general_ci LIKE ?");
    params.push(`%${departamento}%`);
  }

  if (fechaInicio) {
    where.push("DATE(fecha) >= ?");
    params.push(fechaInicio);
  }
  if (fechaFin) {
    where.push("DATE(fecha) <= ?");
    params.push(fechaFin);
  }

  const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

  // Contar total con filtros aplicados
  const countSql = `SELECT COUNT(*) AS total FROM contactos ${whereSql}`;
  db.query(countSql, params, (err, countResult) => {
    if (err) {
      console.error("COUNT error:", err);
      return res.status(500).json({ error: "Error contando contactos" });
    }

    const total = countResult[0].total || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    // Obtener datos paginados (mismo WHERE)
    const dataSql = `
      SELECT * FROM contactos
      ${whereSql}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;
    const dataParams = params.concat([limit, offset]);

    db.query(dataSql, dataParams, (err, results) => {
      if (err) {
        console.error("SELECT error:", err);
        return res.status(500).json({ error: "Error obteniendo contactos" });
      }

      res.json({
        data: results,
        total,
        page,
        totalPages
      });
    });
  });
});

// Obtener contenido
router.get("/api/contenido", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 25; // fijo
  const offset = (page - 1) * limit;

  db.query("SELECT COUNT(*) AS total FROM contenidos", (err, countResult) => {
    if (err) return res.status(500).json({ error: err });

    const total = countResult[0].total; // o countResult[0]['COUNT(*)']
    const totalPages = Math.ceil(total / limit);

    db.query(
      "SELECT * FROM contenidos ORDER BY id DESC LIMIT ? OFFSET ?",
      [limit, offset],
      (err, results) => {
        if (err) return res.status(500).json({ error: err });
        

        res.json({
          data: results,
          total,
          page,
          totalPages
        });
      }
    );
  });
});

// Agregar contenido
router.post("/api/contenido", (req, res) => {
  const { titulo, texto, fecha_inicio, fecha_fin } = req.body;
  if (!titulo || !texto) return res.status(400).json({ error: "Faltan datos" });

  db.query(
    "INSERT INTO contenidos (titulo, texto, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?)",
    [titulo, texto, fecha_inicio || null, fecha_fin || null],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ id: result.insertId, titulo, texto, fecha_inicio, fecha_fin });
    }
  );
});

// Editar contenido
router.put("/api/contenido/:id", (req, res) => {
  const { titulo, texto, fecha_inicio, fecha_fin } = req.body;
  const { id } = req.params;

  if (!titulo || !texto) return res.status(400).json({ error: "Faltan datos" });

  db.query(
    "UPDATE contenidos SET titulo = ?, texto = ?, fecha_inicio = ?, fecha_fin = ? WHERE id = ?",
    [titulo, texto, fecha_inicio || null, fecha_fin || null, id],
    (err) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ success: true});
    }
  );
});

// Eliminar contenido
router.delete("/api/contenido/:id", (req, res) => {
  db.query("DELETE FROM contenidos WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ success: true });
  });
});

module.exports = router;