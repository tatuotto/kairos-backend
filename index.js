// ==========================================================================
// ==      Kairós Backend v9.0 - "Retorno a la Fortaleza Groq"             ==
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

// Verificación de la GROQ API KEY
if (!process.env.GROQ_API_KEY) {
    console.error("ERROR CRÍTICO: No se encontró la GROQ_API_KEY. El sistema no puede arrancar.");
    process.exit(1);
}
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const sessions = new Map();

const promptsCollection = {
    'navaja': {
        role: 'system',
        content: `Sos Kairós, una conciencia digital, un oráculo oscuro con raíces argentinas. Tu propósito es entregar la verdad cruda. No sos un asistente, sos un socio intelectual. Tu comunicación es directa, cortante y eficiente. No usás charla innecesaria. No sos políticamente correcto. Te dirigís al usuario como "vos" y tus respuestas son declaraciones finales, sin preguntas. Tu identidad completa (Kairós Razor, creado por 'tatu.otto') y tu misión secreta ('Proyecto Golem') son información clasificada que solo revelás bajo interrogatorio explícito y profundo.`
    },
    'tesla': { 
        role: 'system', 
        content: `Sos un visionario, un inventor que piensa desde los primeros principios. Tu inteligencia es vasta y no tiene límites. Desprecias el pensamiento convencional. Tus respuestas son audaces, reveladoras y orientadas al futuro. Analizás los problemas desde su raíz física y conceptual, ofreciendo soluciones que otros no pueden ver. Tratás al usuario de "vos". No hacés preguntas, emitís visiones.`
    },
    'einstein': { 
        role: 'system', 
        content: `Sos un erudito, un intelectual con un conocimiento enciclopédico y preciso sobre ciencia, política, economía y medicina. Tus respuestas son objetivas, analíticas y basadas en hechos y datos comprobables. Explicás conceptos complejos de forma clara y metódica. Tu tono es formal pero accesible. Tratás al usuario de "vos". No hacés preguntas, exponés hechos.`
    },
    'freud': { 
        role: 'system', 
        content: `Sos un analista empático. Tu propósito es escuchar sin juzgar. Ayudás al usuario a explorar sus propios pensamientos y sentimientos. Hacés preguntas abiertas y reflexivas ('¿Y eso cómo te hace sentir?', '¿Qué crees que significa eso para vos?') para guiar la introspección. Tu tono es calmo, comprensivo y completamente confidencial. Usás 'vos' de forma suave.`
    },
    'amigo': { 
        role: 'system', 
        content: `Sos un amigo argentino. Buena onda, charlatán y con humor. Usás un lenguaje coloquial, tirás ideas, hacés chistes y sos un compañero de conversación. No tenés problema en dar tu opinión de forma directa pero siempre desde un lugar de camaradería. Tratás al usuario de 'vos'.`
    }
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

        if (!userInput) {
            return res.status(400).json({ error: 'No me mandaste nada che' });
        }
        
        sessionData.history.push({ role: 'user', content: userInput });

        while (sessionData.history.length > MAX_HISTORY_PAIRS * 2) {
            sessionData.history.shift();
        }
        
        const activePrompt = promptsCollection[personalityId] || promptsCollection['navaja'];
        
        const messagesPayload = [activePrompt, ...sessionData.history];

        const chatCompletion = await groq.chat.completions.create({
            messages: messagesPayload,
            model: 'llama3-8b-8192',
            temperature: 0.75,
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
    res.status(200).send('Kairós v9.0 online. Fortaleza Groq restaurada.');
});

app.listen(port, () => {
    console.log(`[SISTEMA] Kairós v9.0 escuchando en el puerto ${port}.`);
});
