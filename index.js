const express = require("express");
const path = require("path"); 
const session = require("express-session");
const app = express();

const webhookRoutes = require("./routes/webhook");
const dashboardRoutes = require("./routes/dashboard");
const loginRoutes = require("./routes/login");
const envioCrmRoutes = require("./routes/envioCrm");

require("dotenv").config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sesión
app.use(session({
    secret: process.env.SESSION_SECRET || "supersecreto",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 } // 1 hora
}));

// Frontend
app.use(express.static(path.join(__dirname, "public")));

// APIs
app.use("/", webhookRoutes);
app.use("/", dashboardRoutes);
app.use("/", loginRoutes);
app.use("/api", envioCrmRoutes);


// Middleware de autenticación
function authMiddleware(req, res, next) {
    if (!req.session.usuarioId) {
        return res.redirect("/"); // si no hay sesión => al login
    }
    next();
}


// Ruta raíz dashboard
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "dashboard/login/login.html"));
});



// Middleware para proteger dashboard
function authMiddleware(req, res, next) {
    if (!req.session.usuarioId) return res.redirect("/"); // Si no hay sesión, al login
    next();
}

// Rutas protegidas
app.get("/dashboard/mensajes", authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, "dashboard/mensajes/mensajes.html"));
});
app.get("/dashboard/contactos", authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, "dashboard/contactos/contactos.html"));
});
app.get("/dashboard/contenido", authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, "dashboard/contenido/contenido.html"));
});

// Archivos estáticos internos del dashboard (css/js/img)
app.use("/dashboard/mensajes", authMiddleware, express.static(path.join(__dirname, "dashboard/mensajes")));
app.use("/dashboard/contactos", authMiddleware, express.static(path.join(__dirname, "dashboard/contactos")));
app.use("/dashboard/contenido", authMiddleware, express.static(path.join(__dirname, "dashboard/contenido")));
app.use("/dashboard/login", express.static(path.join(__dirname, "dashboard/login"))); // login sí es público



// Iniciar servidor
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));


//Este js está básicamente vacío, simplemente utilizamos el enlace para poner operativo el bot