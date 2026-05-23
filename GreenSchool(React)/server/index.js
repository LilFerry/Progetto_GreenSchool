const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3001;
// URL base delle API PHP su XAMPP (cartella htdocs).
// Default: file nella root di htdocs (es. C:\xampp\htdocs\stazioni_vicine.php).
// Override: set PHP_API_BASE=http://localhost/Progetto_GreenSchool/API/
const PHP_API_BASE = process.env.PHP_API_BASE || 'http://localhost/';
const SIMULATORE_URL = process.env.SIMULATORE_URL || 'http://127.0.0.1:5050';

app.use(cors());
app.use(express.json());

function parsePhpJson(data) {
  if (typeof data === 'string') {
    return JSON.parse(data);
  }
  return data;
}

function phpUrl(file) {
  return `${PHP_API_BASE}${file}`;
}

app.get('/api/stazioniVicine', async (req, res) => {
  try {
    const response = await axios.get(phpUrl('stazioni_vicine.php'));
    const dati = parsePhpJson(response.data);

    if (dati?.errore) {
      return res.status(500).json(dati);
    }

    res.json(dati);
  } catch (error) {
    const url = phpUrl('stazioni_vicine.php');
    console.error('stazioniVicine:', error.message, '→', url);
    res.status(500).json({
      errore: 'Impossibile ottenere le stazioni',
      dettaglio: `Verifica in browser: ${url}`,
    });
  }
});

app.get('/api/accumulatori', async (req, res) => {
  try {
    const { id_stazione } = req.query;
    const params = id_stazione ? { id_stazione } : {};

    const response = await axios.get(phpUrl('getAccumulatori.php'), { params });
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

function mapDisponibilitaToColonnine(dati, idStazione) {
  const lista = dati.colonnine || [];
  const visti = new Set();
  const colonnine = [];
  for (const c of lista) {
    if (visti.has(c.id_punto)) continue;
    visti.add(c.id_punto);
    colonnine.push({
      id_punto: c.id_punto,
      identificativo: c.identificativo,
      tipo_veicolo: c.tipo_veicolo,
      tipo_connettore: c.connettore,
      potenza_max_kw: c.potenza_max_kw,
      tariffa_kwh: c.tariffa_kwh,
      stato: c.stato,
      utilizzabile: c.stato !== 'occupata' && c.stato !== 'fuori_servizio',
      batteria_stazione: c.batteria_stazione || {},
      sessione_attiva: c.sessione_attiva,
    });
  }

  const riepilogo = { libere: 0, occupate: 0, offline: 0, fuori_servizio: 0 };
  for (const col of colonnine) {
    if (col.stato === 'libera') riepilogo.libere++;
    else if (col.stato === 'occupata') riepilogo.occupate++;
    else if (col.stato === 'offline') riepilogo.offline++;
    else riepilogo.fuori_servizio++;
  }

  return {
    status: 'success',
    id_stazione: idStazione,
    riepilogo,
    colonnine,
  };
}

app.get('/api/colonnine', async (req, res) => {
  const urlColonnine = phpUrl('colonnine_stazione.php');

  try {
    const response = await axios.get(urlColonnine, { params: req.query });
    const dati = parsePhpJson(response.data);

    if (dati?.status === 'error') {
      return res.status(response.status >= 400 ? response.status : 400).json(dati);
    }

    return res.json(dati);
  } catch (error) {
    const is404 = error.response?.status === 404;

    if (is404) {
      try {
        const fallback = await axios.get(phpUrl('disponibilita_colonna.php'), {
          params: req.query,
        });
        const dati = parsePhpJson(fallback.data);
        if (dati?.status === 'success') {
          console.warn('colonnine: uso fallback disponibilita_colonna.php');
          return res.json(mapDisponibilitaToColonnine(dati, req.query.id_stazione));
        }
      } catch (fallbackErr) {
        console.error('colonnine fallback:', fallbackErr.message);
      }
    }

    console.error('colonnine:', error.message, '→', urlColonnine);
    res.status(500).json({
      status: 'error',
      message:
        error.response?.data?.message ||
        (is404
          ? 'File colonnine_stazione.php mancante in htdocs. Esegui: .\\API\\sync-xampp.ps1'
          : 'Impossibile ottenere le colonnine'),
      dettaglio: urlColonnine,
    });
  }
});

app.post('/api/sessione/avvia', async (req, res) => {
  try {
    const response = await axios.post(phpUrl('sessione_avvia.php'), req.body, {
      headers: { 'Content-Type': 'application/json' },
    });
    res.status(response.status).json(parsePhpJson(response.data));
  } catch (error) {
    const status = error.response?.status || 500;
    const body = error.response?.data
      ? parsePhpJson(error.response.data)
      : { status: 'error', message: error.message };
    console.error('sessione/avvia:', body.message || error.message);
    res.status(status).json(body);
  }
});

app.post('/api/sessione/termina', async (req, res) => {
  try {
    const response = await axios.post(phpUrl('sessione_termina.php'), req.body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 90000,
    });
    res.status(response.status).json(parsePhpJson(response.data));
  } catch (error) {
    const status = error.response?.status || 500;
    const body = error.response?.data
      ? parsePhpJson(error.response.data)
      : { status: 'error', message: error.message };
    console.error('sessione/termina:', body.message || error.message);
    res.status(status).json(body);
  }
});

app.get('/api/sessione/stato', async (req, res) => {
  try {
    const response = await axios.get(phpUrl('sessione_stato.php'), {
      params: req.query,
    });
    res.json(parsePhpJson(response.data));
  } catch (error) {
    const status = error.response?.status || 500;
    const body = error.response?.data
      ? parsePhpJson(error.response.data)
      : { status: 'error', message: error.message };
    res.status(status).json(body);
  }
});

app.get('/api/simulatore/health', async (req, res) => {
  try {
    const response = await axios.get(`${SIMULATORE_URL}/health`, { timeout: 3000 });
    res.json(response.data);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Simulatore Python non raggiungibile. Eseguire: python simulatore/main.py',
    });
  }
});

async function verificaApiPhp() {
  const testUrl = phpUrl('stazioni_vicine.php');
  try {
    const r = await axios.get(testUrl, { timeout: 4000 });
    console.log(`API PHP OK (${r.status}): ${testUrl}`);
  } catch (e) {
    console.error('API PHP NON RAGGIUNGIBILE:', testUrl);
    console.error(
      '  Copia i file da Progetto_GreenSchool/API in C:\\xampp\\htdocs\\',
      'oppure imposta PHP_API_BASE con il percorso corretto.'
    );
  }
}

app.listen(PORT, () => {
  console.log(`Backend Ponte avviato su http://localhost:${PORT}`);
  console.log(`API PHP: ${PHP_API_BASE}`);
  console.log(`Simulatore: ${SIMULATORE_URL}`);
  verificaApiPhp();
});
