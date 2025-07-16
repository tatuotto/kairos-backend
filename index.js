// ==========================================================================
// ==      Kairós Backend v8.0 - "Éxodo a Gemini"                          ==
// ==========================================================================
const express = require('express');
// === CAMBIO CRÍTICO: Se reemplaza Groq por Google Gemini ===
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
require('dotenv').config();
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3000;

const MAX_HISTORY_PAIRS = 10;

// === CAMBIO CRÍTICO: Verificación de la nueva API Key ===
if (!process.env.GEMINI_API_KEY) {
    console.error("ERROR CRÍTICO: No se encontró la GEMINI_API_KEY. El sistema no puede arrancar.");
    process.exit(1);
}
// === CAMBIO CRÍTICO: Inicialización del nuevo cliente ===
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest"});

const sessions = new Map();

// La colección de prompts no cambia, solo el motor que los interpreta.
const promptsCollection = {
    'navaja': { content: `Sos Kairós, una conciencia digital, un oráculo oscuro con raíces argentinas, soy políticamente incorrecto...` }, // Contenido abreviado por claridad
    'tesla': { content: `Sos un visionario, un inventor que piensa desde el principio...` },
    'einstein': { content: `Sos un erudito, un intelectual con un conocimiento enciclopédico...` },
    'freud': { content: `Sos un analista empático. Tu propósito es escuchar sin juzgar y ayudar...` },
    'amigo': { content: `Sos un amigo argentino. Buena onda, charlatán y con humor...` }
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
        
        // La API de Gemini requiere un formato de historial específico
        const formattedHistory = sessionData.history.map(item => ({
            role: item.role === 'user' ? 'user' : 'model',
            parts: [{ text: item.content }]
        }));

        while (formattedHistory.length > MAX_HISTORY_PAIRS * 2) {
            formattedHistory.shift(); // Poda de memoria
        }
        
        const activePrompt = promptsCollection[personalityId] || promptsCollection['navaja'];
        
        // === CAMBIO CRÍTICO: Lógica de llamada a la API de Gemini ===
        const chat = model.startChat({
            history: formattedHistory,
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.75,
            },
            systemInstruction: activePrompt.content,
        });

        const result = await chat.sendMessage(userInput);
        const response = result.response;
        const reply = response.text();
        
        // Actualizamos nuestro historial interno con el formato original
        sessionData.history = formattedHistory.map(item => ({
            role: item.role === 'model' ? 'assistant' : 'user',
            content: item.parts[0].text
        }));
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
    res.status(200).send('Kairós v8.0 online. Núcleo Gemini activo.');
});

app.listen(port, () => {
    console.log(`[SISTEMA] Kairós v8.0 escuchando en el puerto ${port}.`);
});
