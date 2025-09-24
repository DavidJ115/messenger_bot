//Modulo para lectura de archivos locales
const fs = require("fs");

//Conexión a la DB para cargar los contenidos
const db = require("./db");
//Importación de librería de OpenAI
const OpenAI = require("openai");
require("dotenv").config();

//Inicizlización de cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

//Base de datos
//const knowledgeBase = fs.readFileSync("informacion.txt", "utf-8");

//Función para extraer teléfono (8 dígitos exactos)
function extraerTelefono(texto) {
  const match = texto.match(/\b\d{8}\b/);
  return match ? match[0] : null;
}

//Función para filtrar contenido por fechas
function filtrarPorFecha(contenidos) {
  const hoy = new Date();
  return contenidos.filter(c => {
    const inicio = c.fecha_inicio ? new Date(c.fecha_inicio) : null;
    const fin = c.fecha_fin ? new Date(c.fecha_fin) : null;
    return (!inicio || hoy >= inicio) && (!fin || hoy <= fin);
  });
}

//Función de generación de respuestas
async function generarRespuesta(mensaje, contextoUsuario) {
  try {
    //Detectar teléfono antes de IA
    const telefonoDetectado = extraerTelefono(mensaje);
    if (telefonoDetectado && !contextoUsuario.TEL_REAL) {
      contextoUsuario.TEL_REAL = telefonoDetectado;
    }

    //Obtener contenidos desde DB
    const contenidos = await new Promise((resolve, reject) => {
      db.query("SELECT * FROM contenidos ORDER BY id DESC", (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    //Filtrar contenidos vigentes por fecha
    const contenidosVigentes = filtrarPorFecha(contenidos);

    //Construir base de conocimiento como texto para GPT
    const knowledgeBase = contenidosVigentes.map(c => `• ${c.titulo}: ${c.texto}`).join("\n");

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
            "¡Hola NOMBRE_USUARIO!👋💚 Bienvenido al C.A.E., donde comienza tu camino hacia un futuro lleno de oportunidades en salud. 🩺🏆
            ¿En qué puedo ayudarte? Hazme saber si necesitas obtener información personal o saber nuestras ubicaciones"

          - Si el usuario escribe exactamente "gracias", "adiós" o "adios" : 
            "Gracias por tu interés en el C.A.E., referente en la formación de Auxiliares de Enfermería en Honduras. 🩺🏆
            Fue un gusto atenderte hoy y acompañarte en este gran paso hacia tu futuro. ✨
            Si surge alguna duda, escríbenos en cualquier momento 📲 o llámanos al 9455-9526 /
            2220-7001.
            También puedes conocer más en nuestra página: www.cae.edu.hn 🌐"
              
          🔹 Flujo de contacto (asesor o precios/mensualidades):
          - Palabras clave: 'informacion', 'información', 'asesor'. (Cierra el flujo de sedes por completo)
          - Al iniciar este flujo vacía las variables DEP_REAL y TEL_REAL. Nunca confundas mensajes anteriores como valor a estas variables
          - Paso 1: TELÉFONO → Debe ser 8 dígitos. Si ya existe, no pedir de nuevo.
          - Paso 2: DEPARTAMENTO → Lista válida de departamentos de Honduras (Recuerda que aquí puedes aceptarlo sin mayúsculas  o sin tildes). Si ya existe, no pedir de nuevo.
          - Si cuando estas pidiendo el departamento a un cliente y este coincide con una sede, no muestres la información de la sede sigue con la acción de guardar.
          - Cuando tengas ambos ambos devuelve:
            {"accion":"guardar_contacto","nombre":"NOMBRE_USUARIO","departamento":"DEP_REAL","telefono":"TEL_REAL"}
          - Una vez hecho el proceso de contacto, cierra este flujo por completo.

          🔹 Reglas:
          - Para responder no tiene el usuario que poner explicitamente el titulo completo de la información, cualquier similitud o peticiones a información guardada, muestrala
          - Solo puedes estar en un flujo activo a la vez.
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
