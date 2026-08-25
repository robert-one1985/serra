const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('.'));

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

let ultimiDati = {
  temperatura: null,
  umidita_aria: null
};

let ultimoAggiornamento = null;

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

  const adesso = Date.now();
  const scollegato = (ultimoAggiornamento === null) ||
                     (adesso - ultimoAggiornamento > TIMEOUT_SECONDI * 1000);

  if (scollegato) {
    return res.json({
      emoji: '🔌😴',
      messaggio: 'Il sensore fa la nanna 😴🔌',
      temperatura: '--',
      umidita_aria: '--'
    });
  }

  const temp = ultimiDati.temperatura;
  const umid = ultimiDati.umidita_aria;

  try {
    const risposta = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      temperature: 1,
      messages: [{
        role: 'user',
        content: `Sei l'assistente di una serra idroponica in una scuola dell'infanzia.
I bambini di 4-5 anni quasi non sanno leggere: le emoji sono più importanti delle parole,
ma una frase corta e simpatica piace (la maestra la legge ad alta voce).

Dati attuali della serra:
- Temperatura aria: ${temp}°C
- Umidità aria: ${umid}%

Valuta se le piante stanno bene. Per una serra idroponica:
- temperatura ideale: 18-26°C (sopra = caldo, sotto = freddo)
- umidità ideale: 50-70% (sotto = ha sete)

COME DEVE ESSERE LA RISPOSTA:
- "emoji": UNA faccia grande che mostra lo stato (es. 😊 🥵 😟 🥶).
- "messaggio": una frase CORTA e giocosa (max 6-7 parole), con DENTRO 2-3 emoji
  che aiutano a capire anche chi non legge. La pianta parla in prima persona.
- Varia SEMPRE le parole e le emoji, non ripeterti mai.

Esempi di stile (non copiarli identici, inventane di nuovi):
- Tutto bene → "emoji": "😊", "messaggio": "Sto benissimo! 🌱💚 Che bella giornata! ✨"
- Troppo caldo → "emoji": "🥵", "messaggio": "Ho caldo! 🌡️☀️ Voglio aria fresca! 💨"
- Ha sete → "emoji": "😟", "messaggio": "Ho sete! 💧 Dammi da bere! 🚿"
- Troppo freddo → "emoji": "🥶", "messaggio": "Brrr, che freddo! ❄️🧣"

Rispondi SOLO con un oggetto JSON (niente altro testo) in questo formato:
{"emoji": "una faccia grande", "messaggio": "frase corta e giocosa con 2-3 emoji dentro"}`
      }]
    });

    let testo = risposta.content[0].text.trim();
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

    // Riserva: frase + emoji
    let emoji, messaggio;
    if (temp > 28) { emoji = '🥵'; messaggio = 'Ho caldo! 🌡️☀️ Voglio aria! 💨'; }
    else if (temp < 15) { emoji = '🥶'; messaggio = 'Brrr, che freddo! ❄️🧣'; }
    else if (umid < 40) { emoji = '😟'; messaggio = 'Ho sete! 💧 Dammi da bere! 🚿'; }
    else { emoji = '😊'; messaggio = 'Sto benissimo! 🌱💚 Che bello! ✨'; }

    res.json({ emoji, messaggio, temperatura: temp, umidita_aria: umid });
  }
});

app.listen(PORT, () => {
  console.log(`Server avviato! Apri http://localhost:${PORT}`);
});
