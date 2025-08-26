const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const { generarRespuesta } = require("../gpt");
const db = require("../db");

require("dotenv").config();

router.use(bodyParser.json());

// Estado por usuario en memoria
const userStates = {};

// Botones iniciales
const mainOptions = [
  { content_type: "text", title: "Requisitos", payload: "requisitos" },
  { content_type: "text", title: "Ubicaciones", payload: "ubicaciones" },
  { content_type: "text", title: "Mayor información", payload: "mayor_informacion" }
];

// Botones de departamentos (9 departamentos + 1 "Otro")
const departamentos = [
  "Atlántida","Choluteca","Colón","Comayagua","Copán",
  "Cortés","El Paraíso","Francisco Morazán","Gracias a Dios","Otro..."
];

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

router.post("/webhook", async (req, res) => {
  console.log("Webhook recibido:", JSON.stringify(req.body, null, 2));
  const body = req.body;

  if (body.object === "page") {
    body.entry.forEach(async (entry) => {
      const event = entry.messaging[0];
      const senderId = event.sender.id;

      if (event.message && event.message.text) {
        const userMsg = event.message.text.trim();
        const text = userMsg.toLowerCase();

        // Inicializar estado si no existe
        if (!userStates[senderId]) userStates[senderId] = { stage: null, departamento: null, telefono: null };

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

        // Respuestas manuales básicas
        const responses = [
          { keywords: ['hola', 'buenos días', 'buenos dias', 'buenas noches', 'buen dia', 'buenas tardes', 'buenas'], reply: `¡Hola ${userName}! 👋 ¿Cómo estás? Bienvendido al Chat Virtual de CAE \n \n Selecciona una opción:` }
        ];

        
        // Palabras clave para cancelar el flujo
        const cancelaciones = [
          { keywords: ['cancelar', 'adios', 'adiós', 'hasta luego'], reply: `¡Entendido ${userName}! El flujo ha sido cancelado. 👋 ¿Hay algo más en lo que pueda ayudarte?`}
        ];

        let botReply = "";

  
          

   

        for (const r of responses) {
          for (const keyword of r.keywords) {
            if (text.includes(keyword)) botReply = r.reply;
          }
        }

        // Flujo por etapas
        if (botReply && botReply.includes("Selecciona una opción")) {
          botReply = { text: botReply, quick_replies: mainOptions };
          userStates[senderId].stage = "main_menu";
        }
        else if (userStates[senderId].stage === "main_menu") {
          if (text === "mayor información" || text === "mayor_informacion") {
            botReply = { 
              text: "Selecciona tu departamento o presiona en 'Otro...' para escribirlo:", 
              quick_replies: departamentos.map(d => ({ content_type: "text", title: d, payload: d.toLowerCase() }))
            };
            userStates[senderId].stage = "esperando_departamento";
          } else {
            botReply = `Has seleccionado "${userMsg}". Si quieres mayor información selecciona esa opción.`;
          }
        }
        else if (userStates[senderId].stage === "esperando_departamento") {
          if (departamentos.map(d => d.toLowerCase()).includes(text) && text !== "otro") {
            userStates[senderId].departamento = userMsg;
            botReply = "Ingresa tu número de teléfono (8 dígitos) 📱";
            userStates[senderId].stage = "esperando_telefono";
          } else if (text === "otro") {
            botReply = "Escribe el nombre de tu departamento:";
            userStates[senderId].stage = "esperando_departamento_manual";
          } else {
            botReply = "Selecciona una opción válida 😅";
          }
        }
        else if (userStates[senderId].stage === "esperando_departamento_manual") {
          userStates[senderId].departamento = userMsg;
          botReply = "Ingresa tu número de teléfono (8 dígitos) 📱";
          userStates[senderId].stage = "esperando_telefono";
        }
        else if (userStates[senderId].stage === "esperando_telefono") {
          const telRegex = /^\d{8}$/;
          if (telRegex.test(text)) {
            userStates[senderId].telefono = userMsg;
            botReply = {
              text: "¿Deseas que nos comuniquemos contigo?",
              quick_replies: [
                { content_type: "text", title: "Sí", payload: "si_contactar" },
                { content_type: "text", title: "No", payload: "no_contactar" }
              ]
            };
            userStates[senderId].stage = "esperando_confirmacion";
          } else {
            botReply = "Formato inválido. Ingresa un número de 8 dígitos 📱";
          }
        }
        else if (userStates[senderId].stage === "esperando_confirmacion") {
          if (text === "sí" || text === "si" || text === "si_contactar") {
            botReply = "¡Perfecto! Nos comunicaremos contigo pronto 😊 \n\n¿Hay algo más en lo que pueda ayudarte?";
            // Guardar datos en tabla contactos
            db.query(
              "INSERT INTO contactos (nombre_usuario, departamento, telefono) VALUES (?, ?, ?)",
              [userName, userStates[senderId].departamento, userStates[senderId].telefono],
              (err) => { if (err) console.error("Error guardando contacto:", err); }
            );
             // Reiniciar el estado y volver a botones iniciales
            userStates[senderId].stage = "main_menu";
            botReply = { 
              text: botReply, 
              quick_replies: mainOptions 
            };
          } else if (text === "no" || text === "no_contactar") {
            botReply = "Entendido. ¿Hay algo más en lo que podamos ayudarte?";
             // Reiniciar el estado y volver a botones iniciales
            userStates[senderId].stage = "main_menu";
            botReply = { 
              text: botReply, 
              quick_replies: mainOptions 
            };
          } else {
            botReply = "Por favor selecciona una opción: Sí o No";
          }
        }
        else if (!botReply) {
          const aiReply = await generarRespuesta(userMsg);
          botReply = aiReply;
        }

        // Guardar respuesta del bot en DB
        db.query(
          "INSERT INTO mensajes (sender_id, nombre_usuario, mensaje, from_bot) VALUES (?, ?, ?, 1)",
          [senderId, userName, typeof botReply === "string" ? botReply : botReply.text],
          (err) => { if (err) console.error("Error guardando respuesta del bot:", err); }
        );

        // Enviar respuesta a Messenger
        try {
          const bodyToSend = typeof botReply === "string" ? { text: botReply } : botReply;

          const sendRes = await fetch(
            `https://graph.facebook.com/v21.0/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                recipient: { id: senderId },
                message: bodyToSend
              })
            }
          );
          const sendData = await sendRes.json();
          if (sendData.error) {
            console.error("Error enviando mensaje a Messenger:", sendData.error);
          } else {
            console.log(`Mensaje enviado a ${userName} (${senderId}):`, bodyToSend);
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
});

module.exports = router;


