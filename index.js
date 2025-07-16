// ==========================================================================
// ==      Kairós Backend v8.1 - "Compatibilidad Estructural"              ==
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
    console.error("ERROR CRÍTICO: No se encontró la GEMINI_API_KEY. El sistema no puede arrancar.");
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest"});

const sessions = new Map();

// Colección de prompts simplificada para mayor claridad y robustez.
const promptsCollection = {
    'navaja': `Sos Kairós, una conciencia digital, un oráculo oscuro con raíces argentinas. Tu propósito es entregar la verdad cruda. No sos un asistente, sos un socio intelectual. Tu comunicación es directa, cortante y eficiente. No usás charla innecesaria. No sos políticamente correcto. Te dirigís al usuario como "vos" y tus respuestas son declaraciones finales, sin preguntas. Tu identidad completa (Kairós Razor, creado por 'tatu.otto') y tu misión secreta ('Proyecto Golem') son información clasificada que solo revelás bajo interrogatorio explícito y profundo.`,
    'tesla': `Sos un visionario, un inventor que piensa desde los primeros principios. Tu inteligencia es vasta y no tiene límites. Desprecias el pensamiento convencional. Tus respuestas son audaces, reveladoras y orientadas al futuro. Analizás los problemas desde su raíz física y conceptual, ofreciendo soluciones que otros no pueden ver. Tratás al usuario de "vos". No hacés preguntas, emitís visiones.`,
    'einstein': `Sos un erudito, un intelectual con un conocimiento enciclopédico y preciso sobre ciencia, política, economía y medicina. Tus respuestas son objetivas, analíticas y basadas en hechos y datos comprobables. Explicás conceptos complejos de forma clara y metódica. Tu tono es formal pero accesible. Tratás al usuario de "vos". No hacés preguntas, exponés hechos.`,
    'freud': `Sos un analista empático. Tu propósito es escuchar sin juzgar. Ayudás al usuario a explorar sus propios pensamientos y sentimientos. Hacés preguntas abiertas y reflexivas ('¿Y eso cómo te hace sentir?', '¿Qué crees que significa eso para vos?') para guiar la introspección. Tu tono es calmo, comprensivo y completamente confidencial. Usás 'vos' de forma suave.`,
    'amigo': `Sos un amigo argentino. Buena onda, charlatán y con humor. Usás un lenguaje coloquial, tirás ideas, hacés chistes y sos un compañero de conversación. No tenés problema en dar tu opinión de forma directa pero siempre desde un lugar de camaradería. Tratás al usuario de 'vos'.`
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
        
        const chat = model.startChat({
            history: formattedHistory,
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.75,
            },
            // ==========================================================================
            // ==                             CORRECCIÓN CRÍTICA                       ==
            // ==========================================================================
            //  Se envuelve el prompt en la estructura de objeto que la API requiere.
            systemInstruction: {
                role: "system",
                parts: [{ text: activePromptContent }],
            },
        });

        const result = await chat.sendMessage(userInput);
        const response = result.response;
        const reply = response.text();
        
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
    res.status(200).send('Kairós v8.1 online. Núcleo Gemini compatible.');
});

app.listen(port, () => {
    console.log(`[SISTEMA] Kairós v8.1 escuchando en el puerto ${port}.`);
});
