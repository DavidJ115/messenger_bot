const express = require("express");
const path = require("path"); 
const app = express();

const webhookRoutes = require("./routes/webhook");
const dashboardRoutes = require("./routes/dashboard");

require("dotenv").config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Frontend
app.use(express.static(path.join(__dirname, "public")));

// APIs
app.use("/", webhookRoutes);
app.use("/", dashboardRoutes);

// Dashboard: páginas separadas
app.use("/dashboard/mensajes", express.static(path.join(__dirname, "dashboard/mensajes")));
app.use("/dashboard/contactos", express.static(path.join(__dirname, "dashboard/contactos")));
app.use("/dashboard/contenido", express.static(path.join(__dirname, "dashboard/contenido")));
app.use("/dashboard/css", express.static(path.join(__dirname, "dashboard/css")));

// Ruta raíz dashboard
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "dashboard.html"));
});

// Iniciar servidor
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));


//Este js está básicamente vacío, simplemente utilizamos el enlace para poner operativo el bot