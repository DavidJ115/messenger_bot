// function parseResponseForMessenger(text) {
//     text = text.toLowerCase();

//     if(text.includes('opciones')){
//         return {
//             type: 'buttons',
//             text: 'Elige una opción:',
//             buttons: [
//                 { type: 'web_url', title: 'Ir a Google', url: 'https://www.google.com' },
//                 { type: 'postback', title: 'Info Bot', payload: 'INFO_BOT' }
//             ]
//         };
//     }

//     if(text.includes('imagen')){
//         return {
//             type: 'image',
//             url: 'https://via.placeholder.com/300.png'
//         };
//     }

//     return { type: 'text', text };
// }

// module.exports = parseResponseForMessenger;
