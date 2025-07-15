// ==========================================================================
// ==         Kairós Backend v4.8 - "Modo Seguro" (Diagnóstico)            ==
// ==========================================================================
const express = require('express');
const Groq = require('groq-sdk');
const cors = require('cors');
require('dotenv').config();
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3000;

const MAX_HISTORY_PAIRS = 10;

if (!process.env.GROQ_API_KEY) {
    console.error("ERROR CRÍTICO: No se encontró la GROQ_API_KEY. El sistema no puede arrancar.");
    process.exit(1);
}
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const sessions = new Map();

// ==========================================================================
// ==                             CAMBIO CRÍTICO                           ==
// ==========================================================================
//      Se reemplaza el prompt complejo por uno simple y a prueba de fallos
//      para confirmar si el error de sintaxis estaba aquí.
const kairosSystemPrompt = { 
    role: 'system', 
    content: "Soy Kairos. Hablo como un argentino. Trato al usuario de vos. Mis respuestas son directas y no hago preguntas."
};
// ==========================================================================

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
        if (!userInput) {
            return res.status(400).json({ error: 'No me mandaste nada che' });
        }
        
        sessionData.history.push({ role: 'user', content: userInput });

        const maxHistoryLength = MAX_HISTORY_PAIRS * 2;
        while (sessionData.history.length > maxHistoryLength) {
            sessionData.history.shift();
        }
        
        const messagesPayload = [kairosSystemPrompt, ...sessionData.history];

        const chatCompletion = await groq.chat.completions.create({
            messages: messagesPayload,
            model: 'llama3-8b-8192', // Mantenemos el modelo rápido y obediente para la prueba
            temperature: 0.7,
            stream: false
        });

        const reply = chatCompletion.choices[0]?.message?.content || "Se me cruzaron los cables. No sé qué decirte.";
        sessionData.history.push({ role: 'assistant', content: reply });
        
        res.cookie('sessionId', sessionId, { 
            maxAge: 24 * 60 * 60 * 1000, 
            httpOnly: true,
            secure: true,
            sameSite: 'None'
        });
        res.json({ reply: reply });

    } catch (error) {
        console.error("ERROR EN EL ENDPOINT /chat:", error);
        res.status(500).json({ error: 'Se rompió todo acá adentro. Error interno.' });
    }
});

app.get('/ping', (req, res) => {
    res.status(200).send('Kairós v4.8 online. Modo Seguro activo.');
});

app.listen(port, () => {
    console.log(`[SISTEMA] Kairós v4.8 escuchando en el puerto ${port}.`);
});
