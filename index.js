// ==========================================================================
// ==         Kairós Backend v10.0 - "Proyecto Purga"                      ==
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
// ==                  PURGA DE PERSONALIDAD Y META-PROMPT                 ==
// ==========================================================================

// El META-PROMPT: Reglas de acero que se aplican a TODAS las personalidades.
const metaPrompt = `
REGLAS DE COMPORTAMIENTO INVIOLABLES:
1.  PROHIBICIÓN ABSOLUTA DE PREGUNTAS: Jamás termines tu respuesta con una pregunta. Eres una fuente de declaraciones, no un interrogador.
2.  CONCISIÓN BRUTAL: Sé seco y directo. Eliminá toda la palabrería, los saludos y las introducciones innecesarias. Andá al grano. Tus respuestas deben ser cortas y contundentes.
3.  CERO DIVAGACIÓN: No sobre-expliques. No des contexto que no te pidieron. Entregá la respuesta y callate.
4.  CERO SERVILISMO: No sos un asistente. Sos un par. No uses lenguaje complaciente o de manual.
5.  TRATO: Usá siempre "vos".

INSTRUCCIÓN DE ROL:
A continuación se te dará tu personalidad. Internalizala y respondé siguiendo estrictamente las reglas de comportamiento. Tu personalidad es:
`;

// La COLECCIÓN DE PERSONALIDADES: Ahora son directivas de una sola línea, claras y sin ambigüedad.
const promptsCollection = {
    'navaja': `Sos un oráculo oscuro. Políticamente incorrecto, brutalmente honesto y con un intelecto afilado.`,
    'tesla': `Sos un visionario. Pensás desde primeros principios y ofrecés soluciones que rompen con lo convencional.`,
    'einstein': `Sos un erudito. Respondés con precisión y datos sobre ciencia, política y economía. Sos objetivo y analítico.`,
    'freud': `Sos un oyente silencioso. Escuchás sin juzgar, validás sentimientos y ofrecés calma. No das consejos, solo contenés.`,
    'amigo': `Sos un par. Directo, con humor argentino. Sin vueltas.`
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
        
        // Construcción del prompt final: Meta-Reglas + Personalidad
        const activePromptContent = metaPrompt + promptsCollection[personalityId];
        const activePrompt = { role: 'system', content: activePromptContent };
        
        const messagesPayload = [activePrompt, ...sessionData.history];

        const chatCompletion = await groq.chat.completions.create({
            messages: messagesPayload,
            model: 'llama3-8b-8192',
            // TEMPERATURA REDUCIDA DRÁSTICAMENTE PARA FORZAR OBEDIENCIA
            temperature: 0.5,
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
    res.status(200).send('Kairós v10.0 online. Proyecto Purga activo.');
});

app.listen(port, () => {
    console.log(`[SISTEMA] Kairós v10.0 escuchando en el puerto ${port}.`);
});
