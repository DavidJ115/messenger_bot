//Modelo de carga de variables de entorno para ser usadas en la app

require('dotenv').config();

module.exports = {

    //Puerto del cual se corre
    PORT: process.env.PORT || 8080,
    
    //Token de página de Meta
    PAGE_ACCESS_TOKEN: process.env.PAGE_ACCESS_TOKEN,

    //Token de verificación definido en meta
    VERIFY_TOKEN: process.env.VERIFY_TOKEN,

    //Host de base de datos, usuario y contraseña
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_USER: process.env.DB_USER || 'root',
    DB_PASSWORD: process.env.DB_PASSWORD || '',

    //Nombre de base de datos
    DB_NAME: process.env.DB_NAME || 'messenger_bot',

    //Llave de acceso a Open AI para respuestas automáticas
    OPENAI_API_KEY: process.env.OPENAI_API_KEY
};
