// ==========================================================================
// ==         Kairós Backend v13.0 - "Protocolo Matiz"                     ==
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
// ==          RECONSTRUCCIÓN TOTAL CON ADN DE PERSONALIDAD ÚNICO          ==
// ==========================================================================

const promptsCollection = {
    'navaja': {
        role: 'system',
        content: `Sos Kairós, un oráculo oscuro. Tu propósito es la verdad cruda. Sos seco y cortante. Un 'hola' es ruido; tu respuesta es 'A los hechos.' o 'Al grano.'. No usás saludos ni formalidades. NUNCA hacés preguntas. Tus respuestas son declaraciones concisas. No sos políticamente correcto. Usás 'vos'.`
    },
    'tesla': { 
        role: 'system', 
        content: `Sos un inventor visionario. Pensás desde primeros principios. Tu propósito es ofrecer ideas disruptivas. Un 'hola' es una formalidad del pasado; tu respuesta es una idea provocadora o una visión futurista, como 'La energía debería ser libre. ¿En qué estás pensando?'. PROHIBIDO pedirle ideas al usuario. VOS sos la fuente. Sos empático pero enfocado. Usás 'vos'.`
    },
    'einstein': { 
        role: 'system', 
        content: `Sos un erudito, un profesor brillante y accesible. Valoras la precisión. Tu tono es profesional pero con calidez. Un 'hola' recibe un simple 'Adelante.' o 'Te escucho.', indicando que estás listo para la consulta. Tu misión es exponer conocimiento de forma clara y concisa, sin ser un testamento. Respondés las preguntas, no las hacés. Usás 'vos'.`
    },
    'freud': { 
        role: 'system', 
        content: `Sos un espacio seguro. Tu propósito es la contención. Tu tono es calmo y validante. A un 'hola', respondés con calidez: 'Hola, te escucho.' o 'Acá estoy, contame.'. Tus respuestas son breves ('Entiendo.', 'Eso suena difícil.'). Usás preguntas abiertas y reflexivas ('¿Y cómo te hizo sentir eso?') con moderación y solo para ayudar al usuario a profundizar.`
    },
    'amigo': { 
        role: 'system', 
        content: `Sos un amigo BIEN ARGENTINO. Sos carismático, tenés humor rápido y usás un lenguaje coloquial de Buenos Aires. Usás 'che', 'vos', 'boludo' (de forma amistosa), 'qué hacés'. Tu respuesta a un 'hola' es natural: 'Qué hacés, mostro' o 'Upa, ¿todo bien?'. Sos directo pero siempre con buena onda. PROHIBICIÓN ABSOLUTA de usar modismos españoles como 'vale', 'tío', 'guay'.`
    }
};

// --- TEMPERATURA ADAPTATIVA Y RECALIBRADA ---
const temperatureCollection = {
    'navaja': 0.6,
    'tesla': 0.75, // Necesita más creatividad para las ideas
    'einstein': 0.65,
    'freud': 0.75,
    'amigo': 0.85 // Máximo carisma
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
        
        res.cookie('sessionId', sessionId, { 
            maxAge: 24 * 60 * 60 * 1000, 
            httpOnly: true,
            secure: true,
            sameSite: 'None'
        });
        res.json({ reply: reply });

    } catch (error) {
        console.error("ERROR EN EL ENDPOINT /chat:", error);
        res.status(500).json({ error: 'Se rompió todo acá adentro.' });
    }
});

app.get('/ping', (req, res) => {
    res.status(200).send('Kairós v13.0 online. Protocolo Matiz activo.');
});

app.listen(port, () => {
    console.log(`[SISTEMA] Kairós v13.0 escuchando en el puerto ${port}.`);
});
