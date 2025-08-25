const express = require("express");
const app = express();
const webhookRoutes = require("./routes/webhook");
require("dotenv").config();

// Ruta raíz amigable
app.get("/", (req, res) => {
  res.send("Servidor del bot funcionando 🚀");
});

// Rutas del webhook
app.use("/", webhookRoutes);

// Iniciar servidor
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
