const db = require("./db");
const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

//  Función para extraer teléfono (8 dígitos)
function extraerTelefono(texto) {
  if (!texto) return null;
  const soloDigitos = texto.replace(/\D/g, "");
  return soloDigitos.length === 8 ? soloDigitos : null;
}

// Filtrado de contenidos por fecha
function filtrarPorFecha(contenidos) {
  const hoy = new Date();
  return contenidos.filter(c => {
    const inicio = c.fecha_inicio ? new Date(c.fecha_inicio) : null;
    const fin = c.fecha_fin ? new Date(c.fecha_fin) : null;
    return (!inicio || hoy >= inicio) && (!fin || hoy <= fin);
  });
}

//  Obtener historial completo de conversación
async function obtenerHistorialConversacion(senderId) {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT mensaje, from_bot FROM mensajes WHERE sender_id = ? ORDER BY id DESC LIMIT 30",
      [senderId],
      (err, results) => {
        if (err) return reject(err);
        const historial = results
          .reverse()
          .map(r => ({
            role: r.from_bot ? "assistant" : "user",
            content: r.mensaje,
            from_bot: r.from_bot // 👈 importante agregar esto
          }));
        resolve(historial);
      }
    );
  });
}

//  Generar respuesta con GPT
async function generarRespuesta(mensaje, historial = []) {
  try {
    const contenidos = await new Promise((resolve, reject) => {
      db.query("SELECT * FROM contenidos ORDER BY id DESC", (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    const contenidosVigentes = filtrarPorFecha(contenidos);
    const sedes = contenidosVigentes.filter(c =>
      c.titulo.toLowerCase().includes("sede") ||
      c.titulo.toLowerCase().includes("ubicación")
    );
    const promos = contenidosVigentes.filter(c =>
      c.titulo.toLowerCase().includes("promoción") ||
      c.titulo.toLowerCase().includes("descuento") ||
      c.titulo.toLowerCase().includes("campaña")
    );

    const sedesTexto = sedes.map(s => `📍 ${s.titulo}: ${s.texto}`).join("\n") || "No hay información de sedes disponible.";
    const promosTexto = promos.map(p => `🎉 ${p.titulo}: ${p.texto}`).join("\n") || "No hay promociones vigentes.";
    const infoGeneral = contenidosVigentes
      .filter(c => !sedes.includes(c) && !promos.includes(c))
      .map(c => `• ${c.titulo}: ${c.texto}`)
      .join("\n");

    const promptSistema = `
      Eres el asistente oficial del C.A.E. 🩺  
      Responde de forma clara, breve y amable.  
      Usa solo la información provista a continuación para responder.  

      Si el usuario saluda (ej. "hola", "buenas") di:
        "¡Hola NOMBRE_USUARIO!👋💚 Bienvenido al C.A.E., donde comienza tu camino hacia un futuro lleno de oportunidades en salud. 🩺🏆
        ¿En qué puedo ayudarte? Hazme saber si necesitas obtener información personal o saber nuestras ubicaciones"
      Si agradece o se despide (ej. "gracias", "adiós"), despídete cordialmente. 
          "Gracias por tu interés en el C.A.E., referente en la formación de Auxiliares de Enfermería en Honduras. 🩺🏆
          Fue un gusto atenderte hoy y acompañarte en este gran paso hacia tu futuro. ✨
          Si surge alguna duda, escríbenos en cualquier momento 📲 o llámanos al 9455-9526 /
          2220-7001.
          También puedes conocer más en nuestra página: www.cae.edu.hn 🌐"
      Nunca pidas teléfono o sede — eso lo maneja el sistema.  

      Información institucional:
      ${infoGeneral}

      Sedes:
      ${sedesTexto}
      -Cuando se te pregunte por una sede específica, muestra dirección y número de contacto

      Promociones:
      ${promosTexto}
      -Estas las vas a mencionar al final de cada mensaje de forma resumida
    `;

    // Incluir historial más el nuevo mensaje
    const mensajes = [
      { role: "system", content: promptSistema },
      ...historial,
      { role: "user", content: mensaje }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: mensajes
    });

    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error("Error GPT:", err);
    return "Ocurrió un error al procesar tu mensaje.";
  }
}


module.exports = { generarRespuesta, extraerTelefono, obtenerHistorialConversacion };
