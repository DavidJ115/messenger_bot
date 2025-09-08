const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const { generarRespuesta, extraerTelefono } = require("../gpt");
const db = require("../db");

//Carga de ENV
require("dotenv").config();

router.use(bodyParser.json());

// Estado del usuario en memoria
const userStates = {};


//Verificación de Webhook en Meta
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];


  //Verificación de Tokens
  if (mode && token === process.env.VERIFY_TOKEN) {
    console.log("WEBHOOK_VERIFIED");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});


//Recepción de mensajes del webhook
router.post("/webhook", async (req, res) => {
  console.log("Webhook recibido:", JSON.stringify(req.body, null, 2));
  const body = req.body;

  //Verificación de mensajes e ID de quien los manda.
  if (body.object === "page") {
    body.entry.forEach(async (entry) => {
      const event = entry.messaging[0];
      const senderId = event.sender.id;

      if (event.message && event.message.text) {
        const userMsg = event.message.text.trim();

        // Inicializar estado si no existe
        if (!userStates[senderId]) {
          userStates[senderId] = { TEL_REAL: null, DEP_REAL: null, flujo: null };
        }

        // Detección de teléfono
        const tel = extraerTelefono(userMsg);
        if (tel && !userStates[senderId].TEL_REAL) {
          userStates[senderId].TEL_REAL = tel;
        }

        // Detección de departamento
        const departamentosValidos = [
          "Francisco Morazán","Atlántida","Choluteca","Colón","Comayagua","Copán",
          "Cortés","El Paraíso","Gracias a Dios","Intibucá","Islas de la Bahía","La Paz",
          "Lempira","Ocotepeque","Olancho","Santa Bárbara","Valle","Yoro"
        ];
        const depNormalizado = userMsg.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const depEncontrado = departamentosValidos.find(d =>
          d.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === depNormalizado
        );
        if (depEncontrado && !userStates[senderId].DEP_REAL) {
          userStates[senderId].DEP_REAL = depEncontrado;
        }

        // Obtener nombre real de Facebook
        let userName = "Usuario";
        try {
          const profileRes = await fetch(
            `https://graph.facebook.com/${senderId}?fields=first_name,last_name&access_token=${process.env.PAGE_ACCESS_TOKEN}`
          );
          const profileData = await profileRes.json();
          userName = `${profileData.first_name || ""} ${profileData.last_name || ""}`.trim() || "Usuario";
        } catch (err) {
          console.error("Error obteniendo nombre de usuario:", err);
        }

        // Guardar mensaje del usuario
        db.query(
          "INSERT INTO mensajes (sender_id, nombre_usuario, mensaje, from_bot) VALUES (?, ?, ?, 0)",
          [senderId, userName, userMsg],
          (err) => { if (err) console.error("Error guardando mensaje:", err); }
        );

        // Respuesta IA
        let botReply = await generarRespuesta(userMsg, userStates[senderId]);

        // Reemplazar variables con información real
        botReply = botReply
          .replace(/NOMBRE_USUARIO/g, userName)
          .replace(/DEP_REAL/g, userStates[senderId].DEP_REAL || "")
          .replace(/TEL_REAL/g, userStates[senderId].TEL_REAL || "");

        // Verificar si IA pidió guardar contacto
        let jsonContact = null;
        try { jsonContact = JSON.parse(botReply); } catch {}

        if (jsonContact && jsonContact.accion === "guardar_contacto") {
          db.query(
            "INSERT INTO contactos (nombre, departamento, telefono) VALUES (?, ?, ?)",
            [userName, userStates[senderId].DEP_REAL, userStates[senderId].TEL_REAL],
            (err) => { if (err) console.error("Error guardando contacto:", err); }
          );

          // Resetear estado después de guardar
          userStates[senderId] = { TEL_REAL: null, DEP_REAL: null, flujo: null };
          botReply = `¡Perfecto ${userName}! Un asesor se comunicará contigo pronto 😊`;
        }

        // Guardar mensaje del bot
        db.query(
          "INSERT INTO mensajes (sender_id, nombre_usuario, mensaje, from_bot) VALUES (?, ?, ?, 1)",
          [senderId, userName, botReply],
          (err) => { if (err) console.error("Error guardando mensaje bot:", err); }
        );

        // Enviar mensajes al usuario de Messenger
        try {
          await fetch(
            `https://graph.facebook.com/v21.0/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                recipient: { id: senderId },
                message: { text: botReply }
              })
            }
          );
          console.log(`Mensaje enviado a ${userName} (${senderId}):`, botReply);
        } catch (err) {
          console.error("Error enviando mensaje a Messenger:", err);
        }
      }
    });

    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

module.exports = router;
