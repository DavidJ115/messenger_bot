const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const fetch = require("node-fetch"); // v2 para require()
const { generarRespuesta } = require("../gpt");
const db = require("../db");
require("dotenv").config();

router.use(bodyParser.json());

// Verificación del webhook
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === process.env.VERIFY_TOKEN) {
    console.log("WEBHOOK_VERIFIED");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Recibir mensajes
router.post("/webhook", async (req, res) => {
    console.log("Webhook recibido:", JSON.stringify(req.body, null, 2));

  const body = req.body;

  if (body.object === "page") {
    body.entry.forEach(async (entry) => {
      const event = entry.messaging[0];
      const senderId = event.sender.id;

      if (event.message && event.message.text) {
        const userMsg = event.message.text;

        // Obtener nombre del usuario
        let userName = "Usuario";
        try {
          const profileRes = await fetch(
            `https://graph.facebook.com/${senderId}?fields=first_name,last_name&access_token=${process.env.PAGE_ACCESS_TOKEN}`
          );
          const profileData = await profileRes.json();
          userName = profileData.first_name || "Usuario";
        } catch (err) {
          console.error("Error obteniendo nombre de usuario:", err);
        }

        // Guardar mensaje del usuario
        db.query(
          "INSERT INTO mensajes (sender_id, nombre_usuario, mensaje, from_bot) VALUES (?, ?, ?, 0)",
          [senderId, userName, userMsg],
          (err) => { if (err) console.error("Error guardando mensaje:", err); }
        );

        // -------------------------------
        // Respuestas manuales definidas aquí
        // -------------------------------
        let botReply = "";

        if (userMsg.toLowerCase().includes("hola")) {
          botReply = `¡Hola ${userName}! ¿Cómo estás?`;
        } else if (userMsg.toLowerCase().includes("hora")) {
          botReply = `La hora actual es ${new Date().toLocaleTimeString()}`;
        } else if (userMsg.toLowerCase().includes("adios")) {
          botReply = "¡Hasta luego! 👋";
        } else {
          botReply = await generarRespuestaIA(mensajeUsuario); //"Lo siento, no entiendo tu mensaje. 😅";
        }

        // Guardar respuesta del bot en DB
        db.query(
          "INSERT INTO mensajes (sender_id, nombre_usuario, mensaje, from_bot) VALUES (?, ?, ?, 1)",
          [senderId, userName, botReply],
          (err) => { if (err) console.error("Error guardando respuesta del bot:", err); }
        );

        // Enviar respuesta a Messenger
        try {
          const sendRes = await fetch(
            `https://graph.facebook.com/v17.0/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                recipient: { id: senderId },
                message: { text: botReply }
              })
            }
          );
          const sendData = await sendRes.json();
          if (sendData.error) {
            console.error("Error enviando mensaje a Messenger:", sendData.error);
          } else {
            console.log(`Mensaje enviado a ${userName} (${senderId}): ${botReply}`);
          }
        } catch (err) {
          console.error("Error en fetch Messenger:", err);
        }
      }
    });

    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }

    
//   const body = req.body;

//   if (body.object === "page") {
//     body.entry.forEach(async (entry) => {
//       const event = entry.messaging[0];
//       const senderId = event.sender.id;

//       if (event.message && event.message.text) {
//         const userMsg = event.message.text;

//         // Obtener nombre del usuario desde Facebook Graph API
//         let userName = "Usuario";
//         try {
//           const profileRes = await fetch(`https://graph.facebook.com/${senderId}?fields=first_name,last_name&access_token=${process.env.PAGE_ACCESS_TOKEN}`);
//           const profileData = await profileRes.json();
//           userName = profileData.first_name || "Usuario";
//         } catch (err) {
//           console.error("Error obteniendo nombre de usuario:", err);
//         }

//         // Guardar mensaje del usuario
//         db.query(
//           "INSERT INTO mensajes (sender_id, nombre_usuario, mensaje, from_bot) VALUES (?, ?, ?, 0)",
//           [senderId, userName, userMsg],
//           (err) => { if (err) console.error("Error guardando mensaje:", err); }
//         );

//         // Generar respuesta GPT
//         let botReply = await generarRespuesta(userMsg);

//         // Guardar respuesta del bot
//         db.query(
//           "INSERT INTO mensajes (sender_id, nombre_usuario, mensaje, from_bot) VALUES (?, ?, ?, 1)",
//           [senderId, userName, botReply],
//           (err) => { if (err) console.error("Error guardando respuesta del bot:", err); }
//         );

//         // Enviar respuesta a Messenger
//         fetch(`https://graph.facebook.com/v23.0/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             recipient: { id: senderId },
//             message: { text: botReply }
//           })
//         })
//         .then(() => console.log(`Mensaje enviado a ${userName} (${senderId})`))
//         .catch(err => console.error("Error enviando mensaje:", err));
//       }

//     });

//     res.status(200).send("EVENT_RECEIVED");
//   } else {
//     res.sendStatus(404);
//   }
});

module.exports = router;
