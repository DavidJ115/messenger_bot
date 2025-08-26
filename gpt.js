const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

//Generación de respuestas por meido de IA
async function generarRespuesta(mensaje) {
  try {
    // Simulación para pruebas
    return `Simulación GPT: ${mensaje}`;


    // const response = await openai.chat.completions.create({
    //   model: "gpt-4o-mini",
    //   messages: [{ role: "user", content: mensaje }]
    // });
    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error GPT:", error);
    return "Lo siento, ocurrió un error al procesar tu mensaje.";
  }
}

module.exports = { generarRespuesta };
