require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 8080,
    PAGE_ACCESS_TOKEN: process.env.PAGE_ACCESS_TOKEN,
    VERIFY_TOKEN: process.env.VERIFY_TOKEN,
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_USER: process.env.DB_USER || 'root',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_NAME: process.env.DB_NAME || 'messenger_bot',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY
};
