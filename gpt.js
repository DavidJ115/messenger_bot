const fs = require("fs");
const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Carga de banco de datos
const knowledgeBase = fs.readFileSync("informacion.txt", "utf-8");

async function generarRespuesta(mensaje) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",  
      messages: [
        {
          role: "system",
          content: `Eres un asistente que responde SOLO con la información siguiente de forma breve. 
          Si no encuentras la respuesta en esta información, responde: "Lo siento, no tengo esa información disponible".

          Información:
          ${knowledgeBase}`
        },
        {
          role: "user",
          content: mensaje
        }
      ]
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error GPT:", error);
    return "Lo siento, ocurrió un error al procesar tu mensaje.";
  }
}

module.exports = { generarRespuesta };

