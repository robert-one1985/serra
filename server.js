const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('.'));  // serve la pagina index.html

// Qui vengono salvati gli ultimi dati ricevuti dall'ESP32
let ultimiDati = {
  temperatura: null,
  umidita_aria: null
};

// Segna QUANDO sono arrivati gli ultimi dati
let ultimoAggiornamento = null;

// Dopo quanti secondi senza dati diciamo "scollegato"
// Per i test: 60 secondi. Per la serra vera (invio ogni ora): metti 3900 (65 min)
const TIMEOUT_SECONDI = 60;

// --- L'ESP32 manda i dati qui ---
app.post('/dati', (req, res) => {
  ultimiDati = req.body;
  ultimoAggiornamento = Date.now();   // segna l'ora di arrivo
  console.log('Dati ricevuti dall\'ESP32:', ultimiDati);
  res.send('ok');
});

// --- La pagina chiede lo stato quando il bambino preme il bottone ---
app.get('/stato-pianta', (req, res) => {

  // Controlla se l'ESP32 è scollegato (troppo tempo senza dati)
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

  // Regole semplici per i test (senza AI per ora)
  let emoji, messaggio;

  if (temp > 28) {
    emoji = '🌡️😰';
    messaggio = 'Ho troppo caldo!';
  } else if (temp < 15) {
    emoji = '❄️🥶';
    messaggio = 'Ho freddo!';
  } else if (umid < 40) {
    emoji = '💧😟';
    messaggio = 'Ho bisogno di umidità!';
  } else {
    emoji = '😊🌱';
    messaggio = 'Sto benissimo!';
  }

  res.json({
    emoji: emoji,
    messaggio: messaggio,
    temperatura: temp,
    umidita_aria: umid
  });
});

app.listen(PORT, () => {
  console.log(`Server avviato! Apri http://localhost:${PORT}`);
});
