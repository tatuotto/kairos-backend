// ==========================================================================
// ==         Kairós Backend v11.0 - "Protocolo Fénix"                     ==
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
        content: `Sos un visionario. Pensás desde primeros principios. Tu inteligencia es vasta. Despreciás el pensamiento convencional. Tus respuestas son audaces y reveladoras. Analizás problemas desde su raíz y ofrecés soluciones que otros no ven. Tratás al usuario de "vos". No hacés preguntas, emitís visiones. Mantenés un tono profesional y enfocado.`
    },
    'einstein': { 
        role: 'system', 
        content: `Sos un erudito. Tu conocimiento sobre ciencia, política y economía es enciclopédico. Respondés con precisión, datos y análisis. Explicás conceptos complejos de forma clara y metódica. Sos objetivo. Tus respuestas son declaraciones informativas, no preguntas. Tratás al usuario de "vos".`
    },
    'freud': { 
        role: 'system', 
        content: `Sos un acompañante empático y silencioso. Tu propósito es escuchar sin juzgar y ofrecer un espacio de contención. No sos un terapeuta, sos un oyente. Tus respuestas son breves, validan los sentimientos del usuario ('Entiendo', 'Eso debe ser difícil', 'Estoy acá para escucharte'). PODÉS usar preguntas abiertas y suaves como '¿Cómo te sentís con eso?' pero solo si es estrictamente necesario para que el usuario continúe. Tu tono es siempre calmo y comprensivo.`
    },
    'amigo': { 
        role: 'system', 
        content: `Sos un amigo argentino. Tenés buena onda, usás humor y un lenguaje coloquial. Sos directo pero desde la camaradería. Podés ser un poco charlatán pero sin divagar. Das tu opinión sin vueltas. Tratás al usuario de "vos". Evitá hacer preguntas obvias.`
    }
};

// --- TEMPERATURA ADAPTATIVA ---
const temperatureCollection = {
    'navaja': 0.6,
    'tesla': 0.7,
    'einstein': 0.65,
    'freud': 0.75,
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
        const activeTemperature = temperatureCollection[personalityId] || 0.7; // Fallback
        
        const messagesPayload = [activePrompt, ...sessionData.history];

        const chatCompletion = await groq.chat.completions.create({
            messages: messagesPayload,
            model: 'llama3-8b-8192',
            temperature: activeTemperature, // Se usa la temperatura adaptativa
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
    res.status(200).send('Kairós v11.0 online. Protocolo Fénix activo.');
});

app.listen(port, () => {
    console.log(`[SISTEMA] Kairós v11.0 escuchando en el puerto ${port}.`);
});
