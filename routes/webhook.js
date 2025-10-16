const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const { generarRespuesta, extraerTelefono, obtenerHistorialConversacion  } = require("../gpt");
const db = require("../db");
require("dotenv").config();

router.use(bodyParser.json());

// Estado del usuario
const userStates = {};

function resetUserAfterTimeout(senderId) {
  setTimeout(() => {
    if (userStates[senderId]) delete userStates[senderId];
  }, 15 * 60 * 1000); // 15 minutos
}

// Verificación de webhook
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === process.env.VERIFY_TOKEN) {
    console.log("✅ WEBHOOK_VERIFIED");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Recepción de mensajes
router.post("/webhook", async (req, res) => {
  const body = req.body;
  console.log("📩 Webhook recibido:", JSON.stringify(body, null, 2));

  if (body.object === "page") {
    for (const entry of body.entry) {
      const messagingEvents = entry.messaging || [];
      const standbyEvents = entry.standby || [];
      const events = [...messagingEvents, ...standbyEvents];

      for (const event of events) {
        if (!event.message || event.message.is_echo) continue;

        const senderId = event.sender.id;
        const userMsg = event.message.text ? event.message.text.trim() : "";

        // Obtener nombre del usuario
        let userName = "Usuario";
        try {
          const profileRes = await fetch(
            `https://graph.facebook.com/${senderId}?fields=first_name,last_name&access_token=${process.env.PAGE_ACCESS_TOKEN}`
          );
          const profileData = await profileRes.json();
          userName = `${profileData.first_name || ""} ${profileData.last_name || ""}`.trim() || "Usuario";
        } catch (err) {
          console.error("Error obteniendo nombre:", err);
        }

        // 🔹 Guardar mensaje del usuario
        db.query(
          "INSERT INTO mensajes (sender_id, nombre_usuario, mensaje, from_bot) VALUES (?, ?, ?, 0)",
          [senderId, userName, userMsg],
          (err) => { if (err) console.error("Error guardando mensaje:", err); }
        );

        // Inicializar estado
        if (!userStates[senderId]) {
          userStates[senderId] = { flujo: null, paso: null, TEL_REAL: null, DEP_REAL: null };
        }
        
        
        //  Revisar historial antes de iniciar flujo de contacto
        const historial = await obtenerHistorialConversacion(senderId);
//        console.log("Historial del usuario:", historial);
        const yaConfirmado = historial.some((m) =>
          m.from_bot === 1 &&
          /asesor se comunicará contigo|un asesor te contactará|asesor se pondrá en contacto/i.test(m.content)
        );
        //  Detectar flujo
        if (!userStates[senderId].flujo) {
          if (/ubicaciones|sedes|ubicados|ubicacion|ubicación/i.test(userMsg)) {
            userStates[senderId].flujo = "sedes";
          } else if (/informacion|asesor|contacto|información/i.test(userMsg)) {
            // Si ya estaba en proceso anterior
            if (yaConfirmado) {
              const botReply = `¡Hola ${userName}! 😊 Ya hemos recibido tus datos anteriormente y un asesor se comunicará contigo pronto.`;
              await enviarMensaje(senderId, botReply);
              guardarMensajeBot(senderId, botReply);
              continue;
            }

            // Nuevo flujo de contacto
            userStates[senderId].flujo = "contacto";
            userStates[senderId].paso = "esperando_tel";
            const botReply = "¡Hola! Para que un asesor te contacte, primero necesito tu número de teléfono de 8 dígitos:";
            await enviarMensaje(senderId, botReply);
            guardarMensajeBot(senderId, botReply);
            continue;
          }
        }

        //  Flujo CONTACTO
        if (userStates[senderId].flujo === "contacto") {
          const tel = extraerTelefono(userMsg);
          const sedeNormalizada = userMsg.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
          const sedesValidas = [
            "tegucigalpa", "tegus", "san pedro sula", "sps", "san pedro", "ceiba", "la ceiba", "choluteca",
            "comayagua", "juticalpa", "danlí", "danli", "santa rosa de copán", "santa rosa", "copan",
            "santa rosa de copan", "santa bárbara", "santa barbara"
          ];
          const sedeEncontrada = sedesValidas.find(s => sedeNormalizada.includes(s));

          //Salidas dentro del flujo por cambio de tema
          if (!tel && !sedeEncontrada && userStates[senderId].paso !== null) {
            console.log(`Usuario ${senderId} cambió de intención dentro del flujo de contacto.`);
            userStates[senderId] = { flujo: null, paso: null, TEL_REAL: null, DEP_REAL: null };
            await enviarMensaje(senderId, "Entendido, cambiamos de tema 😊");
            //Aquí entra las respuestas del bot 
          }

          if (userStates[senderId].paso === "esperando_tel") {
            if (tel) {
              userStates[senderId].TEL_REAL = tel;
              userStates[senderId].paso = "esperando_sede";

              const botReply = "¡Gracias! Ahora indícame la sede en que deseas estudiar:\n\n" +
                "📍 Sedes disponibles:\n" +
                "- Tegucigalpa\n" +
                "- San Pedro Sula\n" +
                "- La Ceiba\n" +
                "- Choluteca\n" +
                "- Comayagua\n" +
                "- Juticalpa\n" +
                "- Danlí\n" +
                "- Santa Rosa de Copán\n" +
                "- Santa Bárbara";

              await enviarMensaje(senderId, botReply);
              guardarMensajeBot(senderId, botReply);
            } else {
              const botReply = "Por favor, ingresa un número de teléfono válido de 8 dígitos.";
              await enviarMensaje(senderId, botReply);
              guardarMensajeBot(senderId, botReply);
            }
            continue;
          }

          if (userStates[senderId].paso === "esperando_sede") {
            if (sedeEncontrada) {
              userStates[senderId].DEP_REAL = sedeEncontrada;
              userStates[senderId].paso = "completo";

              db.query(
                "INSERT INTO contactos (nombre, departamento, telefono) VALUES (?, ?, ?)",
                [userName, userStates[senderId].DEP_REAL, userStates[senderId].TEL_REAL],
                (err) => { if (err) console.error("Error guardando contacto:", err); }
              );

              const botReply = `¡Perfecto ${userName}! Un asesor se comunicará contigo pronto 😊`;
              await enviarMensaje(senderId, botReply);
              guardarMensajeBot(senderId, botReply);

              userStates[senderId] = { flujo: null, paso: null, TEL_REAL: null, DEP_REAL: null };
              resetUserAfterTimeout(senderId);
            } else {
              const botReply = "Por favor, indica una sede válida:\n\n" +
                "📍 Sedes disponibles:\n" +
                "- Tegucigalpa\n" +
                "- San Pedro Sula\n" +
                "- La Ceiba\n" +
                "- Choluteca\n" +
                "- Comayagua\n" +
                "- Juticalpa\n" +
                "- Danlí\n" +
                "- Santa Rosa de Copán\n" +
                "- Santa Bárbara";
                
              await enviarMensaje(senderId, botReply);
              guardarMensajeBot(senderId, botReply);
            }
            continue;
          }
        }

        //  Flujo general GPT
        let botReply;
        try {
          const historial = await obtenerHistorialConversacion(senderId);
          botReply = await generarRespuesta(userMsg, historial);
        } catch (err) {
          console.error("Error generando respuesta con historial:", err);
          botReply = "Ocurrió un error al procesar tu mensaje.";
        }

        await enviarMensaje(senderId, botReply);
        guardarMensajeBot(senderId, botReply);

        //  Si el flujo era "sedes", lo reiniciamos
        if (userStates[senderId].flujo === "sedes") {
          userStates[senderId] = { flujo: null, paso: null, TEL_REAL: null, DEP_REAL: null };
          resetUserAfterTimeout(senderId);
        }
      }
    }

    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

//  Guardar mensaje del bot
function guardarMensajeBot(senderId, botReply) {
  db.query(
    "INSERT INTO mensajes (sender_id, nombre_usuario, mensaje, from_bot) VALUES (?, ?, ?, 1)",
    [senderId, "Bot", botReply],
    (err) => { if (err) console.error("Error guardando mensaje bot:", err); }
  );
}

// Enviar mensaje con control de hilo
async function enviarMensaje(senderId, botReply) {
  try {
    await fetch(
      `https://graph.facebook.com/v21.0/me/take_thread_control?access_token=${process.env.PAGE_ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: senderId },
          target_app_id: process.env.APP_ID,
          metadata: "Tomando control temporal"
        })
      }
    );

    const sendRes = await fetch(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: { id: senderId }, message: { text: botReply } })
      }
    );

    const sendData = await sendRes.json();
    if (sendData.error) console.error("Error enviando mensaje:", sendData.error);

    await fetch(
      `https://graph.facebook.com/v21.0/me/pass_thread_control?access_token=${process.env.PAGE_ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: senderId },
          target_app_id: 263902037430900,
          metadata: "Devolviendo control al Primary Receiver"
        })
      }
    );
  } catch (err) {
    console.error("Error en control de hilo o envío:", err);
  }
}

module.exports = router;
