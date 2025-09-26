const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt");

// POST /login
router.post("/login", (req, res) => {
    const { usuario, contraseña } = req.body;

    db.query("SELECT * FROM usuarios WHERE usuario = ?", [usuario], async (err, results) => {
        if (err) return res.status(500).send("Error en la base de datos");
        if (results.length === 0) return res.status(401).send("Credenciales incorrectas");

        const usuarioDB = results[0];
        const passValida = contraseña === usuarioDB.contraseña;

        if (!passValida) return res.status(401).send("Credenciales incorrectas");

        // Guardar sesión
        req.session.usuarioId = usuarioDB.id;

        res.status(200).send("Login exitoso");
    });
});

router.post("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).send("Error al cerrar sesión");
        res.clearCookie("connect.sid"); // limpiar cookie de sesión
        res.status(200).send("Logout exitoso");
    });
});

module.exports = router;