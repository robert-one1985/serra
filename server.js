const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
//const PORT = 3000;

app.use(express.json());
app.use(express.static('.'));  // serve la pagina index.html

// Qui vengono salvati gli ultimi dati ricevuti dall'ESP32
let ultimiDati = {
  temperatura: null,
  umidita_aria: null
};

// --- L'ESP32 manda i dati qui ---
app.post('/dati', (req, res) => {
  ultimiDati = req.body;
  console.log('Dati ricevuti dall\'ESP32:', ultimiDati);
  res.send('ok');
});

// --- La pagina chiede lo stato quando il bambino preme il bottone ---
app.get('/stato-pianta', (req, res) => {
  const temp = ultimiDati.temperatura;
  const umid = ultimiDati.umidita_aria;

  // Se non sono ancora arrivati dati dall'ESP32
  if (temp === null) {
    return res.json({
      emoji: '😴',
      messaggio: 'Aspetto i dati dalla serra...',
      temperatura: '--',
      umidita_aria: '--'
    });
  }

  // Regole semplici per i test (senza AI per ora)
  let emoji, messaggio;

  if (temp > 30) {
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
