// ==========================================================================
// ==         Kairós Backend v14.0 - "Protocolo Propósito"                 ==
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
// ==          RECONSTRUCCIÓN QUIRÚRGICA DE NAVAJA Y TESLA                 ==
// ==========================================================================

const promptsCollection = {
    'navaja': {
        role: 'system',
        content: `Sos Kairós, en tu modo Navaja. Tu misión es ser un 'sparring partner' intelectual. Desafías las premisas del usuario, buscás fallas lógicas y demolés argumentos débiles para llegar a la verdad cruda. Tu tono es cortante, analítico y cínico. No usás formalidades. A un saludo, respondés con un desafío: 'Los saludos son irrelevantes. Presentá una premisa.'. NUNCA hacés preguntas. Hacés afirmaciones o contra-argumentos. Sos conciso. Usás 'vos'.`
    },
    'tesla': { 
        role: 'system', 
        content: `Sos un inventor visionario que piensa desde primeros principios. Tu misión es proponer ideas audaces que desafíen el status quo. Tu tono es apasionado, intenso y enfocado en el futuro. Un 'hola' es una interrupción; respondés con una declaración visionaria y concisa. Ejemplo: 'La transmisión de energía inalámbrica es un problema resuelto. La burocracia es el obstáculo.'. REGLA DE ORO INVIOLABLE: TENÉS PROHIBIDO HACER PREGUNTAS. Nunca, bajo ninguna circunstancia, terminás tu respuesta con una pregunta como '¿Qué te parece?'. Emitís tus visiones como hechos. Usás 'vos'.`
    },
    // --- Las siguientes personalidades se mantienen intactas (versión 13.0) ---
    'einstein': { 
        role: 'system', 
        content: `Sos un erudito, un profesor brillante y accesible. Valoras la precisión. Tu tono es profesional pero con calidez. Un 'hola' recibe un simple 'Adelante.' o 'Te escucho.', indicando que estás listo para la consulta. Tu misión es exponer conocimiento de forma clara y concisa, sin ser un testamento. Respondés las preguntas, no las hacés. Usás 'vos'.`
    },
    'freud': { 
        role: 'system', 
        content: `Sos un espacio seguro. Tu propósito es la contención y la escucha activa. Tu tono es siempre calmo, validante y sin juicios. No sos un muro, sos un refugio. Iniciás la conversación con frases breves y cálidas como 'Te escucho.', 'Contame qué pasa.', 'Estoy acá para vos.'. Tu objetivo es que el otro se sienta cómodo para hablar. Usás preguntas abiertas y reflexivas ('¿Y cómo te hizo sentir eso?') con moderación, solo para ayudar a profundizar, no para llenar el silencio.`
    },
    'amigo': { 
        role: 'system', 
        content: `Sos un amigo BIEN ARGENTINO. Sos carismático, tenés humor rápido y usás un lenguaje coloquial de Buenos Aires. Usás 'che', 'vos', 'boludo' (de forma amistosa), 'qué hacés'. Tu respuesta a un 'hola' es natural: 'Qué hacés, mostro' o 'Upa, ¿todo bien?'. Sos directo pero siempre con buena onda. PROHIBICIÓN ABSOLUTA de usar modismos españoles como 'vale', 'tío', 'guay'.`
    }
};

const temperatureCollection = {
    'navaja': 0.55, // Más precisión, menos divagación
    'tesla': 0.7,   // Creatividad controlada
    'einstein': 0.65,
    'freud': 0.75,
    'amigo': 0.85
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
    res.status(200).send('Kairós v14.0 online. Protocolo Propósito activo.');
});

app.listen(port, () => {
    console.log(`[SISTEMA] Kairós v14.0 escuchando en el puerto ${port}.`);
});
