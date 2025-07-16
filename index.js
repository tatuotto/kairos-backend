// ==========================================================================
// ==      Kairós Backend v8.2 - "Núcleo Eficiente Gemini"                 ==
// ==========================================================================
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
// ... resto de los require ...

const app = express();
// ... resto de la configuración inicial ...

if (!process.env.GEMINI_API_KEY) {
    console.error("ERROR CRÍTICO: No se encontró la GEMINI_API_KEY.");
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// ==========================================================================
// ==                             CAMBIO CRÍTICO                           ==
// ==========================================================================
//      Se hace un downgrade del modelo a una versión con límites más laxos.
const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro"});
// ==========================================================================

const sessions = new Map();
const promptsCollection = { /* ... como en la v8.1 ... */ };

// ... el resto del código es idéntico al de la v8.1 ...
