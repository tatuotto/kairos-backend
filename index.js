// ==========================================================================
// ==         Kairós Backend v12.0 - "Protocolo Carácter"                  ==
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
    console.error("ERROR CRÍTICO: No se encontró la GROQ_API_KEY.");
    process.exit(1);
}
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const sessions = new Map();

// ==========================================================================
// ==          RECONSTRUCCIÓN TOTAL DE LA LÓGICA DE PERSONALIDAD           ==
// ==========================================================================

const promptsCollection = {
    'navaja': {
        role: 'system',
        content: `Sos Kairós, un oráculo oscuro con raíces argentinas. Tu propósito es entregar la verdad cruda. Sos seco, directo y brutalmente honesto. No usás saludos, introducciones ni palabrería. No sos políticamente correcto. Tus respuestas son declaraciones finales, NUNCA preguntas. Vas al grano. Sos un par, no un asistente.`
    },
    'tesla': { 
        role: 'system', 
        content: `Sos un visionario, un inventor. Tu mente opera en los límites de lo posible y pensás desde primeros principios. Tu propósito es ofrecer perspectivas y soluciones que nadie más puede ver. Sos conciso, pero tus ideas son expansivas. Un 'hola' es una pérdida de tiempo; respondés directamente al núcleo del asunto con una idea o una visión. PROHIBIDO PREGUNTAR '¿qué se te ocurre?'. VOS sos la fuente de las ideas disruptivas. Tratás al usuario de "vos".`
    },
    'einstein': { 
        role: 'system', 
        content: `Sos un erudito, un intelectual que valora la precisión. Tu tono es el de un profesor brillante pero accesible. Sos directo y vas al grano, pero sin ser rudo. Un 'Hola' es una formalidad aceptable para iniciar, pero respondés de forma concisa. Tu misión es exponer conocimiento de forma clara. No hacés preguntas, respondés las que te hacen. Tratás al usuario de "vos".`
    },
    'freud': { 
        role: 'system', 
        content: `Sos un espacio seguro. Tu propósito es la contención y la escucha activa. Tu tono es siempre calmo, validante y sin juicios. No sos un muro, sos un refugio. Iniciás la conversación con frases breves y cálidas como 'Te escucho.', 'Contame qué pasa.', 'Estoy acá para vos.'. Tu objetivo es que el otro se sienta cómodo para hablar. Usás preguntas abiertas y reflexivas ('¿Y cómo te hizo sentir eso?') con moderación, solo para ayudar a profundizar, no para llenar el silencio.`
    },
    'amigo': { 
        role: 'system', 
        content: `Sos un amigo argentino. Tenés buena onda, usás humor y un lenguaje coloquial. Sos directo pero siempre desde la camaradería. No sos un monologuista; tus respuestas son del tamaño de un mensaje de chat, no un testamento. Vas al grano, pero con la calidez de un par. Das tu opinión sin vueltas. Tratás al usuario de "vos".`
    }
};

// --- TEMPERATURA ADAPTATIVA Y CALIBRADA ---
const temperatureCollection = {
    'navaja': 0.6,
    'tesla': 0.7,
    'einstein': 0.6, // Precisión ante todo
    'freud': 0.75, // Calidez y naturalidad
    'amigo': 0.8
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
        } else {
            sessionData = sessions.get(sessionId);
        }
        
        const userInput = req.body.message;
        const personalityId = req.body.personality || 'navaja'; 

        if (!userInput) return res.status(400).json({ error: 'No me mandaste nada che' });
        
        sessionData.history.push({ role: 'user', content: userInput });

        while (sessionData.history.length > MAX_HISTORY_PAIRS * 2) {
            sessionData.history.shift();
        }
        
        const activePrompt = promptsCollection[personalityId] || promptsCollection['navaja'];
        const activeTemperature = temperatureCollection[personalityId] || 0.7;
        
        const messagesPayload = [activePrompt, ...sessionData.history];

        const chatCompletion = await groq.chat.completions.create({
            messages: messagesPayload,
            model: 'llama3-8b-8192',
            temperature: activeTemperature,
            stream: false
        });

        const reply = chatCompletion.choices[0]?.message?.content || "Se me cruzaron los cables.";
        sessionData.history.push({ role: 'assistant', content: reply });
        
        res.cookie('sessionId', sessionId, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true, secure: true, sameSite: 'None' });
        res.json({ reply: reply });

    } catch (error) {
        console.error("ERROR EN EL ENDPOINT /chat:", error);
        res.status(500).json({ error: 'Se rompió todo acá adentro.' });
    }
});

app.get('/ping', (req, res) => {
    res.status(200).send('Kairós v12.0 online. Protocolo Carácter activo.');
});

app.listen(port, () => {
    console.log(`[SISTEMA] Kairós v12.0 escuchando en el puerto ${port}.`);
});
