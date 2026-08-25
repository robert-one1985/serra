const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('.'));

// Client di Claude - legge la chiave dalle variabili d'ambiente (sicura)
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

// Ultimi dati ricevuti dall'ESP32
let ultimiDati = {
  temperatura: null,
  umidita_aria: null
};

// Segna quando sono arrivati gli ultimi dati
let ultimoAggiornamento = null;

// Dopo quanti secondi senza dati diciamo "scollegato"
// Test: 60 secondi. Serra vera (invio ogni ora): metti 3900
const TIMEOUT_SECONDI = 60;

// --- L'ESP32 manda i dati qui ---
app.post('/dati', (req, res) => {
  ultimiDati = req.body;
  ultimoAggiornamento = Date.now();
  console.log('Dati ricevuti dall\'ESP32:', ultimiDati);
  res.send('ok');
});

// --- La pagina chiede lo stato quando il bambino preme il bottone ---
app.get('/stato-pianta', async (req, res) => {
  res.set('Cache-Control', 'no-store');

  // Controlla se l'ESP32 è scollegato
  const adesso = Date.now();
  const scollegato = (ultimoAggiornamento === null) ||
                     (adesso - ultimoAggiornamento > TIMEOUT_SECONDI * 1000);

  if (scollegato) {
    return res.json({
      emoji: '🔌😴',
      messaggio: 'Sensore non collegato',
      temperatura: '--',
      umidita_aria: '--'
    });
  }

  const temp = ultimiDati.temperatura;
  const umid = ultimiDati.umidita_aria;

  // --- Chiediamo a CLAUDE come sta la pianta ---
  try {
    const risposta = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Sei l'assistente di una serra idroponica in una scuola dell'infanzia.
I bambini di 4-5 anni premono un bottone per sapere come stanno le piante.

Dati attuali della serra:
- Temperatura aria: ${temp}°C
- Umidità aria: ${umid}%

Valuta se le piante stanno bene. Considera che per una serra idroponica:
- temperatura ideale: 18-26°C
- umidità ideale: 50-70%

Rispondi SOLO con un oggetto JSON (niente altro testo) in questo formato:
{"emoji": "una o due emoji grandi sullo stato", "messaggio": "una frase brevissima e semplice per bambini di 4-5 anni"}

Esempi di messaggi adatti: "Sto benissimo!", "Ho un po' caldo!", "Ho sete!", "Che bella giornata!"`
      }]
    });

    // Estrai il testo della risposta di Claude
    let testo = risposta.content[0].text.trim();

    // Pulisci eventuali backtick markdown
    testo = testo.replace(/```json/g, '').replace(/```/g, '').trim();

    const datiClaude = JSON.parse(testo);

    res.json({
      emoji: datiClaude.emoji,
      messaggio: datiClaude.messaggio,
      temperatura: temp,
      umidita_aria: umid
    });

  } catch (errore) {
    console.error('Errore con Claude:', errore.message);

    // Se Claude non risponde, usiamo le regole semplici come riserva
    let emoji, messaggio;
    if (temp > 28) { emoji = '🌡️😰'; messaggio = 'Ho troppo caldo!'; }
    else if (temp < 15) { emoji = '❄️🥶'; messaggio = 'Ho freddo!'; }
    else if (umid < 40) { emoji = '💧😟'; messaggio = 'Ho bisogno di umidità!'; }
    else { emoji = '😊🌱'; messaggio = 'Sto benissimo!'; }

    res.json({ emoji, messaggio, temperatura: temp, umidita_aria: umid });
  }
});

app.listen(PORT, () => {
  console.log(`Server avviato! Apri http://localhost:${PORT}`);
});
