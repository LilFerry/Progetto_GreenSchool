const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3001;
const PHP_API_BASE = 'http://localhost/Ye';

app.use(cors());
app.use(express.json());

function parsePhpJson(data) {
  if (typeof data === 'string') {
    return JSON.parse(data);
  }
  return data;
}

app.get('/api/stazioniVicine', async (req, res) => {
  try {
    const response = await axios.get(`${PHP_API_BASE}/stazioni_vicine.php`);
    const dati = parsePhpJson(response.data);

    if (dati?.errore) {
      return res.status(500).json(dati);
    }

    res.json(dati);
  } catch (error) {
    console.error('stazioniVicine:', error.message);
    res.status(500).json({ errore: 'Impossibile ottenere le stazioni' });
  }
});

app.get('/api/accumulatori', async (req, res) => {
  try {
    const { id_stazione } = req.query;
    const params = id_stazione ? { id_stazione } : {};

    const response = await axios.get(`${PHP_API_BASE}/getAccumulatori.php`, {
      params,
    });

    const dati = parsePhpJson(response.data);

    if (dati?.errore) {
      return res.status(500).json(dati);
    }

    res.json(dati);
  } catch (error) {
    console.error('accumulatori:', error.message);
    res.status(500).json({ errore: 'Impossibile ottenere gli accumulatori' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend Ponte avviato su http://localhost:${PORT}`);
});