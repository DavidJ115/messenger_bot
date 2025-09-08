//Modulo para lectura de archivos locales
const fs = require("fs");

//Importación de librería de OpenAI
const OpenAI = require("openai");
require("dotenv").config();

//Inicizlización de cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Base de datos
const knowledgeBase = fs.readFileSync("informacion.txt", "utf-8");

// Función para extraer teléfono (8 dígitos exactos)
function extraerTelefono(texto) {
  const match = texto.match(/\b\d{8}\b/);
  return match ? match[0] : null;
}

//Función de generación de respuestas
async function generarRespuesta(mensaje, contextoUsuario) {
  try {
    // Detectar teléfono antes de IA
    const telefonoDetectado = extraerTelefono(mensaje);
    if (telefonoDetectado && !contextoUsuario.TEL_REAL) {
      contextoUsuario.TEL_REAL = telefonoDetectado;
    }

    //Llamado a respuestas, definimos modelo y el rol a cumplir por la IA
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres el asistente oficial de nuestra página. 
          Responde breve, claro y amable.
          Usa solo nuestra base para responder sobre CAE.
          Cuando hables de CAE, refiérete como "nuestra".

          🔹 Saludos:
          - Si el usuario escribe exactamente "hola": 
            "¡Hola NOMBRE_USUARIO!👋 Bienvenido al chatbot CAE 😊. ¿En qué te puedo ayudar?"

          🔹 Flujo de contacto (asesor o precios/mensualidades):
          - Palabras clave: 'informacion', 'información', 'asesor', 'contacto', 'precio', 'matricula', 'matrícula', 'mensualidad', 'costo', 'valor'. (Cierra el flujo de sedes por completo)
          - Al iniciar este flujo vacía las variables DEP_REAL y TEL_REAL. Nunca confundas mensajes anteriores como valor a estas variables
          - Paso 1: TELÉFONO → Debe ser 8 dígitos. Si ya existe, no pedir de nuevo.
          - Paso 2: DEPARTAMENTO → Lista válida de departamentos de Honduras (Recuerda que aquí puedes aceptarlo sin mayúsculas  o sin tildes). Si ya existe, no pedir de nuevo.
          - Si cuando estas pidiendo el departamento a un cliente y este coincide con una sede, no muestres la información de la sede sigue con la acción de guardar.
          - Cuando tengas ambos ambos devuelve:
            {"accion":"guardar_contacto","nombre":"NOMBRE_USUARIO","departamento":"DEP_REAL","telefono":"TEL_REAL"}
          - Una vez hecho el proceso de contacto, cierra este flujo por completo.


          🔹 Flujo de sedes:
          - Palabras claves: "sede", "ubicación", "dirección", "dónde están", "ubicados", "ubicaciones" → enlista solo la sede y el whatsapp, nada de direcciones.
          - Palabras claves: "sede", "ubicación", "dirección", "dónde están", "ubicados", "ubicaciones" junto el nombre de una sede → enlista la dirección y el contacto de whatsapp.
          - Muestra la información ordenada para que sea clara y visible al usuario.

          🔹 Reglas:
          - Solo puedes estar en un flujo activo a la vez, si el usuario quiere contacto, olvida cualquier información de sedes y viceversa.
          - Si cambia de tema, olvida flujo anterior.
          - No debes enlistar los departamentos cuando pides que se ingrese en el flujo de contacto.
          - Siempre pregunta al final: "¿Te puedo ayudar en algo más?" (excepto si mandas JSON o si te envió un teléfono y le estás pidiendo que ingrese el departamento). 

          Información:
          ${knowledgeBase}`
        },
        {
          role: "user",
          content: JSON.stringify({ mensaje, contextoUsuario })
        }
      ]
    });

    //Retorno de respuesta
    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error GPT:", error);
    return "Lo siento, ocurrió un error al procesar tu mensaje.";
  }
}

module.exports = { generarRespuesta, extraerTelefono };
