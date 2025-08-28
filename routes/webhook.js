const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const { generarRespuesta } = require("../gpt");
const db = require("../db");

require("dotenv").config();

router.use(bodyParser.json());

// Estado del usuario en memoria para saber flujo
const userStates = {};

// Botones iniciales (con botón salir agregado)
const mainOptions = [
  { content_type: "text", title: "Requisitos", payload: "requisitos" },
  { content_type: "text", title: "Ubicaciones", payload: "ubicaciones" },
  { content_type: "text", title: "Mayor información", payload: "mayor_informacion" },
  { content_type: "text", title: "Salir", payload: "salir" }
];

// Botones de departamentos
const departamentos = [ { content_type: "text", title: "Francisco Morazán", payload: "francisco morazan" }, 
  { content_type: "text", title: "Cortés", payload: "cortes" }, 
  { content_type: "text", title: "Copán", payload: "copan" }, 
  { content_type: "text", title: "Comayagua", payload: "comayagua" }, 
  { content_type: "text", title: "Choluteca", payload: "choluteca" }, 
  { content_type: "text", title: "Olancho", payload: "olancho" }, 
  { content_type: "text", title: "Atlántida", payload: "atlantida" }, 
  { content_type: "text", title: "El Paraiso", payload: "el paraiso" }, 
  { content_type: "text", title: "Santa Bárbara", payload: "santa barbara" },
  { content_type: "text", title: "Otro", payload: "otro"} 
];
//Botones de sedes
const sedes = [
  { content_type: "text", title: "Tegucigalpa", payload: "cae_tegus" },
  { content_type: "text", title: "San Pedro Sula", payload: "cae_sps" },
  { content_type: "text", title: "Comayagua", payload: "cae_comayagua" },
  { content_type: "text", title: "Choluteca", payload: "cae_choluteca" },
  { content_type: "text", title: "Juticalpa", payload: "cae_juticalpa" },
  { content_type: "text", title: "La Ceiba", payload: "cae_laceiba" },
  { content_type: "text", title: "Danlí", payload: "cae_danli" },
  { content_type: "text", title: "Santa Bárbara", payload: "cae_sb" },
  { content_type: "text", title: "Santa Rosa de Copán", payload: "cae_src" }
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

        if (!userStates[senderId]) userStates[senderId] = { stage: null, departamento: null, telefono: null };

        // Obtener nombre del usuario
        let userName = " ";
        try {
          const profileRes = await fetch(
            `https://graph.facebook.com/${senderId}?fields=first_name,last_name&access_token=${process.env.PAGE_ACCESS_TOKEN}`
          );
          const profileData = await profileRes.json();
          userName = profileData.first_name +" " + profileData.last_name|| "Usuario";
        } catch (err) {
          console.error("Error obteniendo nombre de usuario:", err);
        }

        // Guardar mensaje
        db.query(
          "INSERT INTO mensajes (sender_id, nombre_usuario, mensaje, from_bot) VALUES (?, ?, ?, 0)",
          [senderId, userName, userMsg],
          (err) => { if (err) console.error("Error guardando mensaje:", err); }
        );

        let botReply = "";

        // Cancelación de flujo desde cualquier punto
        const cancelKeywords = ["cancelar", "adios", "adiós", "hasta luego", "salir"];
        if (cancelKeywords.some(k => text.includes(k))) {
          userStates[senderId] = { stage: null, departamento: null, telefono: null };
          botReply = `¡Entendido ${userName}! Espero haberte sido útil 👋 \nSi necesitas aún información solo di hola`; 
        } 
        else {
          // // Respuestas básicas si está activada la IA
          // // Cuando esta línea está activa se activará el menú inicial cuando detecte alguna de las palabras claves, caso contrario pasará a responder por medio de IA

          // const responses = [
          //   { keywords: ['hola', 'buenos días', 'buenos dias', 'buenas noches', 'buen dia', 'buenas tardes', 'buenas', 'información'], reply: `¡Hola ${userName}! 👋 Bienvenido al Chat Virtual de CAE\n\nSelecciona una opción:` }
          // ];

          // for (const r of responses) {
          //   for (const keyword of r.keywords) {
          //     if (text.includes(keyword)) botReply = r.reply;
          //   }
          // }


          /*******/
          //Flujo//
          /*******/

          //Menú inicial: Saludo y opciones iniciales
          if (botReply && botReply.includes("Selecciona una opción")) {
            botReply = { text: botReply, quick_replies: mainOptions };
            userStates[senderId].stage = "main_menu";
          }
          else if (userStates[senderId].stage === "main_menu") {

            //Llamada a llenar la tabla de contacto si el usuario necesita más información
            if (text === "mayor información" || text === "mayor_informacion") {
              botReply = { 
                text: "Selecciona tu departamento o presiona en 'Otro...' para escribirlo:",quick_replies: departamentos};
                userStates[senderId].stage = "esperando_departamento";

            //Llamada al mensaje predeterminado si el usuario quiere saber los requisitos    
            } else if (text === "requisitos") {
              botReply = {
                text: "Requisitos para ingresar al CAE 📋:\n1️⃣ Edad: 18 a 38 años \n2️⃣ Haber completado la secundaria o tercer año del ciclo común \n3️⃣ Vocación de servicio \n\n"+
                "Documentos para matricula 📋:\n✔️ 2 copias del título secundaria o certificado del tercer año de ciclo común, ambas caras \n✔️ 2 copias ampliadas del DNI \n✔️ Hoja de antecendentes penales vigentes \n✔️ Hoja de antecedentes policiales \n 2 fotografías tamaño carnet \n\n"+
                "¿Te puedo ayudar con algo más? 😊", 
                quick_replies: mainOptions
              }

            //Llamada a imprimir las sedes de CAE
            }else if (text === "ubicaciones"){
              botReply = {text: "📍 Selecciona la ubicación más conveniente:", quick_replies: sedes};
              userStates[senderId].stage = "esperando_ubicacion";
            }
          }
          //Llamada para que el usuario obtenga información de cada sede si ya seleccionó alguna
          else if (userStates[senderId].stage === "esperando_ubicacion") {
            const ubicaciones = {
              cae_tegus: "🏢 C.A.E. Tegucigalpa\n\n📍 Antiguo Edificio del Instituto ALPHA, 2da av. Calle Real, Comayagüela\n\n📞 2220-6001 / 2220-7001 \n📱 9455-9672",
              cae_sps: "🏢 C.A.E. San Pedro Sula\n\n📍 3ra ave, 11 calle SO, Barrio Lempira, Edif. Andalucía\n\n📞 2550-0397 / 2550-0395 \n📱 9455-6318",
              cae_comayagua: "🏢 C.A.E. Comayagua\n\n📍 Blvd. Roberto Romero, antes de La Colonia, Iglesia Avance Misionero\n\n📞 2772-2063 \n📱 9452-8574",
              cae_choluteca: "🏢 C.A.E. Choluteca\n\n📍 Barrio Cabañas, frente a Escuela Cabañas\n\n📞 2780-0272 \n📱 9455-9688",
              cae_juticalpa: "🏢 C.A.E. Juticalpa\n\n📍 Barrio la Hoya, casa #231, frente a Instituto de la Propiedad\n\n📞 2785-1524 \n📱 3236-9335",
              cae_laceiba: "🏢 C.A.E. La Ceiba\n\n📍 Edificio CAE, 2do nivel frente a Edificio Cosmo Centro\n\n📞 2442-2724 / 2442-2734 \n📱 9455-6876",
              cae_danli: "🏢 C.A.E. Danlí\n\n📍 Barrio Buenos Aires, Instituto Cosme García, salida a El Paraíso\n\n📞 2763-5970 \n📱 9455-9332",
              cae_sb: "🏢 C.A.E. Santa Bárbara\n\n📍 Barrio La Encantadora, salida a San Pedro Sula\n\n📞 2643-2949 \n📱 9455-7352",
              cae_src: "🏢 C.A.E. Santa Rosa de Copán\n\n📍 Bo. Santa Teresa, contiguo a Sociedad Copaneca de Obreros\n\n📞 2662-6301 \n📱 9450-8618"
            };

            const quickPayload = event.message.quick_reply?.payload
              ? String(event.message.quick_reply.payload).toLowerCase()
              : null;

            // Normalizador de texto si el usuario escribe a mano cada sede
            const normalize = (s) =>
              s
                .normalize("NFD")                     
                .replace(/[\u0300-\u036f]/g, "")     
                .toLowerCase()
                .replace(/\s+/g, "_");               

            const titleToPayload = {
              tegucigalpa: "cae_tegus",
              san_pedro_sula: "cae_sps",
              comayagua: "cae_comayagua",
              choluteca: "cae_choluteca",
              juticalpa: "cae_juticalpa",
              la_ceiba: "cae_laceiba",
              danli: "cae_danli",
              santa_barbara: "cae_sb",
              santa_rosa_de_copan: "cae_src"
            };

            const fromTitle = titleToPayload[ normalize(event.message.text || "") ];

            const key = (quickPayload || fromTitle || "").toLowerCase();

            //Impresión de datos de la sede seleccionada: ubicación y contactos
            //Vuelve a mostrar menú inicial
            if (key && ubicaciones[key]) {
              botReply = { text: ubicaciones[key]+ "\n \n \n ¿Puedo ayudarte en algo más? 😊",quick_replies: mainOptions};
              userStates[senderId].stage = "main_menu";
            } else {
              botReply = {
                text: "Selecciona una ubicación válida 😅", quick_replies: sedes};
            }
          
          //Continuación de ciclo de más información, el cliente ingresa el departamento de donde es
          }else if (userStates[senderId].stage === "esperando_departamento") {
            const quickPayload = event.message.quick_reply?.payload 
              ? String(event.message.quick_reply.payload).toLowerCase()
              : null;

            if (quickPayload && quickPayload !== "otro") {
              // Guardamos el departamento y pedimos el número telefónico
              userStates[senderId].departamento = quickPayload;
              botReply = "Ingresa tu número de teléfono (8 dígitos) 📱";
              userStates[senderId].stage = "esperando_telefono";
            
            //Si es de otro departamento y selecciona otro, pide el ingreso manual
            } else if (quickPayload === "otro") {
              botReply = "Por favor escribe tu departamento 📝";
              userStates[senderId].stage = "esperando_departamento_manual";
            } else {
              botReply = { 
                text: "Selecciona un departamento válido 😅", 
                quick_replies: departamentos 
              };
            }
          }

          //Llamado cuando el departamento es manual para continuar pidiendo el número telefónico
          else if (userStates[senderId].stage === "esperando_departamento_manual") {
            userStates[senderId].departamento = userMsg;
            botReply = "Ingresa tu número de teléfono (8 dígitos) 📱";
            userStates[senderId].stage = "esperando_telefono";
          }
          //Cuando llama a escribir el número ocurre el otro estado, donde estamos esperando la respuesta del cliente
          //Pedimos número de 8 digitos
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
              //Solicita ingresar número nuevo si es más de 8 digitos
              botReply = "Formato inválido. Ingresa un número de 8 dígitos 📱";
            }
          }
          //Parte del ciclo si el cliente quiere ser contactado
          else if (userStates[senderId].stage === "esperando_confirmacion") {

            //Si el cliente quiere ser contactado
            if (text === "sí" || text === "si" || text === "si_contactar") {
              botReply = "¡Perfecto! Un asesor se comunicará contigo pronto 😊";
              db.query(
                //Guardado de clientes a ser contactados en la table
                "INSERT INTO contactos (nombre_usuario, departamento, telefono) VALUES (?, ?, ?)",
                [userName, userStates[senderId].departamento, userStates[senderId].telefono],
                (err) => { if (err) console.error("Error guardando contacto:", err); }
              );
              userStates[senderId].stage = "main_menu";
              botReply = { text: botReply, quick_replies: mainOptions };

            //Si el cliente no quiere ser contactado
            } else if (text === "no" || text === "no_contactar") {
              botReply = "Entendido. ¿Hay algo más en lo que podamos ayudarte? 😊";
              userStates[senderId].stage = "main_menu";
              botReply = { text: botReply, quick_replies: mainOptions };
            } else {
              botReply = "Por favor selecciona una opción: Sí o No";
            }
          }
          else if (!botReply) {

            // //Respuesta si no está activa la respuesta por IA
            // //Si está activo este código cuando el bot detecte que se envió un mensaje se activará el menú inicial
            botReply = { text: `¡Hola ${userName}! 👋 Bienvenido al Chat Virtual de CAE\n\nSelecciona una opción:` , quick_replies: mainOptions };
            userStates[senderId].stage = "main_menu";

            // //Respuesta si está activada la respuesta por IA
            // //Si está activada esta línea junto a las palabras claves iniciales permitirá que si no se ingresa la palabra clave inicial se busque por medio de IA
            // const aiReply = await generarRespuesta(userMsg);
            // botReply = aiReply;
          }
        }

        // Guardar respuesta del bot en otra tabla, así vemos el flujo conversional de los usuarios
        db.query(
          "INSERT INTO mensajes (sender_id, nombre_usuario, mensaje, from_bot) VALUES (?, ?, ?, 1)",
          [senderId, userName, typeof botReply === "string" ? botReply : botReply.text],
          (err) => { if (err) console.error("Error guardando respuesta del bot:", err); }
        );

        // Enviar a Messenger
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
