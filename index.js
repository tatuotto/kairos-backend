// ==========================================================================
// ==      Kairós Backend v8.3 - "Compatibilidad Legacy Gemini"            ==
// ==========================================================================
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
require('dotenv').config();
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3000;

const MAX_HISTORY_PAIRS = 10;

if (!process.env.GEMINI_API_KEY) {
    console.error("ERROR CRÍTICO: No se encontró la GEMINI_API_KEY.");
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Usamos el modelo 1.0 Pro, que no soporta systemInstruction.
const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro"});

const sessions = new Map();

const promptsCollection = {
    'navaja': `Sos Kairós...`, // Contenidos de prompt abreviados por claridad
    'tesla': `Sos un visionario...`,
    'einstein': `Sos un erudito...`,
    'freud': `Sos un analista empático...`,
    'amigo': `Sos un amigo argentino...`
};

const corsOptions = {
  origin: 'https://tatuotto.github.io',
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.post('/chat', async (req, res) => {
    try {
        let sessionId = req.cookies.sessionId;
        let sessionData;

        if (!sessionId || !sessions.has(sessionId)) {
            sessionId = uuidv4();
            sessionData = { history: [] };
            sessions.set(sessionId, sessionData);
            console.log(`[SESIÓN] Nueva sesión creada: ${sessionId}`);
        } else {
            sessionData = sessions.get(sessionId);
        }
        
        const userInput = req.body.message;
        const personalityId = req.body.personality || 'navaja'; 

        if (!userInput) return res.status(400).json({ error: 'No me mandaste nada che' });
        
        const formattedHistory = sessionData.history.map(item => ({
            role: item.role === 'user' ? 'user' : 'model',
            parts: [{ text: item.content }]
        }));

        while (formattedHistory.length > MAX_HISTORY_PAIRS * 2) {
            formattedHistory.shift();
        }
        
        const activePromptContent = promptsCollection[personalityId] || promptsCollection['navaja'];
        
        // ==========================================================================
        // ==                             CORRECCIÓN CRÍTICA                       ==
        // ==========================================================================
        //  Como gemini-1.0-pro no soporta 'systemInstruction', inyectamos el prompt
        //  como el primer mensaje del historial.
        
        // Creamos un historial para esta petición específica
        const requestHistory = [
            // Inyectamos el rol del usuario primero con el prompt
            { role: "user", parts: [{ text: activePromptContent }] },
            // Luego un rol de modelo indicando que ha entendido
            { role: "model", parts: [{ text: "Entendido. Procedo." }] },
            // Y finalmente el historial real de la conversación
            ...formattedHistory
        ];

        const chat = model.startChat({
            history: requestHistory,
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.75,
            },
            // El campo systemInstruction se elimina por completo.
        });

        const result = await chat.sendMessage(userInput);
        const response = result.response;
        const reply = response.text();
        
        // Actualizamos el historial REAL, sin el prompt inyectado.
        sessionData.history.push({ role: 'user', content: userInput });
        sessionData.history.push({ role: 'assistant', content: reply });
        
        res.cookie('sessionId', sessionId, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true, secure: true, sameSite: 'None' });
        res.json({ reply: reply });

    } catch (error) {
        console.error("ERROR EN EL ENDPOINT /chat:", error);
        res.status(500).json({ error: 'Se rompió todo acá adentro. Error interno.' });
    }
});

app.get('/ping', (req, res) => {
    res.status(200).send('Kairós v8.3 online. Núcleo Gemini Legacy compatible.');
});

app.listen(port, () => {
    console.log(`[SISTEMA] Kairós v8.3 escuchando en el puerto ${port}.`);
});
