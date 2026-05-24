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
    const trimmed = data.trim();
    if (trimmed === '') {
      throw new Error(
        'Risposta PHP vuota (file non aggiornato?). Esegui API/sync-xampp.ps1'
      );
    }
    if (trimmed.startsWith('<')) {
      const snippet = trimmed.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
      throw new Error(
        snippet ||
          'Risposta HTML da PHP (file API mancante?). Esegui API/sync-xampp.ps1'
      );
    }
    return JSON.parse(trimmed);
  }
  return data;
}

function phpErrorBody(error, fallbackMessage) {
  if (!error.response?.data) {
    return { status: 'error', message: error.message || fallbackMessage };
  }
  try {
    return parsePhpJson(error.response.data);
  } catch (parseErr) {
    return {
      status: 'error',
      message: parseErr.message || fallbackMessage,
      dettaglio: phpUrl(''),
    };
  }
}

function phpUrl(file) {
  return `${PHP_API_BASE}${file}`;
}

app.post('/api/auth/login', async (req, res) => {
  try {
    const response = await axios.post(phpUrl('utente_login.php'), req.body, {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true,
    });
    res.status(response.status).json(parsePhpJson(response.data));
  } catch (error) {
    res.status(500).json(phpErrorBody(error, 'Impossibile effettuare il login'));
  }
});

app.post('/api/auth/registra', async (req, res) => {
  try {
    const response = await axios.post(phpUrl('utente_registra.php'), req.body, {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true,
    });
    res.status(response.status).json(parsePhpJson(response.data));
  } catch (error) {
    res.status(500).json(phpErrorBody(error, 'Impossibile registrarsi'));
  }
});

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
    console.error('[ERRORE] stazioniVicine:', error.message, '→', url);
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
    console.error('[ERRORE] accumulatori:', error.message);
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
          console.warn('[WARN] colonnine: uso fallback disponibilita_colonna.php');
          return res.json(mapDisponibilitaToColonnine(dati, req.query.id_stazione));
        }
      } catch (fallbackErr) {
        console.error('[ERRORE] colonnine fallback:', fallbackErr.message);
      }
    }

    console.error('[ERRORE] colonnine:', error.message, '→', urlColonnine);
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
      validateStatus: () => true,
    });
    const body = parsePhpJson(response.data);
    if (response.status >= 400) {
      console.error('[ERRORE] sessione/avvia:', body.message);
    }
    res.status(response.status).json(body);
  } catch (error) {
    const status = error.response?.status || 500;
    const body = phpErrorBody(error, 'Impossibile avviare la sessione');
    console.error('[ERRORE] sessione/avvia:', body.message || error.message);
    res.status(status).json(body);
  }
});

app.post('/api/sessione/termina', async (req, res) => {
  try {
    const response = await axios.post(phpUrl('sessione_termina.php'), req.body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 90000,
      validateStatus: () => true,
    });
    const body = parsePhpJson(response.data);
    if (response.status >= 400) {
      console.error('[ERRORE] sessione/termina:', body.message);
    }
    res.status(response.status).json(body);
  } catch (error) {
    const status = error.response?.status || 500;
    const body = phpErrorBody(error, 'Impossibile terminare la sessione');
    console.error('[ERRORE] sessione/termina:', body.message || error.message);
    res.status(status).json(body);
  }
});

app.get('/api/sessione/stato', async (req, res) => {
  try {
    const response = await axios.get(phpUrl('sessione_stato.php'), {
      params: req.query,
      validateStatus: () => true,
    });
    const body = parsePhpJson(response.data);
    res.status(response.status).json(body);
  } catch (error) {
    const status = error.response?.status || 500;
    const body = phpErrorBody(error, 'Impossibile leggere lo stato sessione');
    res.status(status).json(body);
  }
});

app.post('/api/sessione/salva', async (req, res) => {
  try {
    const response = await axios.post(phpUrl('sessione_salva.php'), req.body, {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true,
    });
    res.status(response.status).json(parsePhpJson(response.data));
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json(phpErrorBody(error, 'Impossibile salvare la sessione'));
  }
});

function proxyAdminGet(file, req, res, fallback) {
  axios
    .get(phpUrl(file), { params: req.query, validateStatus: () => true })
    .then((response) => {
      const raw = response.data;
      if (raw === '' || raw == null || (typeof raw === 'string' && raw.trim() === '')) {
        return res.status(502).json({
          status: 'error',
          message: `Risposta vuota da ${file}. Esegui API/sync-xampp.ps1 e riavvia Apache.`,
        });
      }
      try {
        res.status(response.status).json(parsePhpJson(raw));
      } catch (parseErr) {
        res.status(502).json({
          status: 'error',
          message: parseErr.message || fallback,
        });
      }
    })
    .catch((error) => res.status(500).json(phpErrorBody(error, fallback)));
}

function proxyAdminPost(file, req, res, fallback) {
  axios
    .post(phpUrl(file), req.body, {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true,
    })
    .then((response) => res.status(response.status).json(parsePhpJson(response.data)))
    .catch((error) => res.status(500).json(phpErrorBody(error, fallback)));
}

app.get('/api/admin/stazioni', (req, res) => {
  proxyAdminGet('admin_stazioni.php', req, res, 'Impossibile elencare le stazioni');
});

app.post('/api/admin/stazioni', (req, res) => {
  proxyAdminPost('admin_stazioni.php', req, res, 'Errore gestione stazione');
});

app.get('/api/admin/colonnine', (req, res) => {
  proxyAdminGet('admin_colonnine.php', req, res, 'Impossibile elencare le colonnine');
});

app.post('/api/admin/colonnine', (req, res) => {
  proxyAdminPost('admin_colonnine.php', req, res, 'Errore gestione colonnina');
});

app.get('/api/admin/report-giornaliero', (req, res) => {
  proxyAdminGet('report_giornaliero.php', req, res, 'Impossibile ottenere il report giornaliero');
});

app.get('/api/gamification/profilo', async (req, res) => {
  try {
    const response = await axios.get(phpUrl('gamification_profilo.php'), {
      params: req.query,
      validateStatus: () => true,
    });
    res.status(response.status).json(parsePhpJson(response.data));
  } catch (error) {
    res.status(500).json(phpErrorBody(error, 'Impossibile caricare il profilo gamification'));
  }
});

app.get('/api/gamification/classifica', async (req, res) => {
  try {
    const response = await axios.get(phpUrl('gamification_classifica.php'), {
      params: req.query,
      validateStatus: () => true,
    });
    res.status(response.status).json(parsePhpJson(response.data));
  } catch (error) {
    res.status(500).json(phpErrorBody(error, 'Impossibile caricare la classifica'));
  }
});

app.get('/api/scuola/consumi', async (req, res) => {
  try {
    const response = await axios.get(phpUrl('scuola_consumi.php'), {
      params: req.query,
      validateStatus: () => true,
    });
    res.status(response.status).json(parsePhpJson(response.data));
  } catch (error) {
    res.status(500).json(phpErrorBody(error, 'Impossibile caricare i dati della scuola'));
  }
});

app.get('/api/sessioni', async (req, res) => {
  try {
    const response = await axios.get(phpUrl('sessioni_lista.php'), {
      params: req.query,
      validateStatus: () => true,
    });
    res.status(response.status).json(parsePhpJson(response.data));
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json(phpErrorBody(error, 'Impossibile ottenere lo storico sessioni'));
  }
});

app.post('/api/accumulatore/scarica', async (req, res) => {
  try {
    const response = await axios.post(phpUrl('accumulatore_scarica.php'), req.body, {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true,
    });
    res.status(response.status).json(parsePhpJson(response.data));
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json(phpErrorBody(error, 'Impossibile aggiornare accumulatore'));
  }
});

app.get('/api/simulatore/health', async (req, res) => {
  try {
    const response = await axios.get(phpUrl('simulatore_health.php'), {
      timeout: 8000,
      validateStatus: () => true,
    });
    const body = parsePhpJson(response.data);
    res.status(response.status >= 400 ? 503 : 200).json(body);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message:
        'Simulatore non verificabile. Avvia: python simulatore/main.py (porta 5050) e verifica http://127.0.0.1:5050/health',
      dettaglio: error.message,
    });
  }
});

async function verificaApiPhp() {
  const testUrl = phpUrl('stazioni_vicine.php');
  try {
    const r = await axios.get(testUrl, { timeout: 4000 });
    console.log(`[OK] API PHP raggiungibile (${r.status}): ${testUrl}`);
  } catch (e) {
    console.error('[ERRORE] API PHP NON RAGGIUNGIBILE:', testUrl);
    console.error(
      '  → Copia i file da Progetto_GreenSchool/API in C:\\xampp\\htdocs\\',
      'oppure imposta PHP_API_BASE con il percorso corretto.'
    );
    return;
  }

  const sessionUrl = phpUrl('sessione_avvia.php');
  try {
    const r = await axios.post(
      sessionUrl,
      { id_punto: '__healthcheck__' },
      { headers: { 'Content-Type': 'application/json' }, timeout: 4000, validateStatus: () => true }
    );
    const raw = typeof r.data === 'string' ? r.data.trim() : '';
    if (raw.startsWith('<')) {
      console.error('[ERRORE] API sessioni NON CONFIGURATA (risposta HTML):', sessionUrl);
      console.error('  → Esegui: .\\API\\sync-xampp.ps1  (copia includes/ in htdocs)');
    } else {
      console.log(`[OK] API sessioni raggiungibile: ${sessionUrl}`);
    }
  } catch (e) {
    console.error('[ERRORE] API sessioni non verificabile:', sessionUrl, e.message);
  }
}

app.listen(PORT, () => {
  console.log('─────────────────────────────────────────');
  console.log(`  Backend Ponte avviato su http://localhost:${PORT}`);
  console.log(`  API PHP  : ${PHP_API_BASE}`);
  console.log(`  Simulatore: ${SIMULATORE_URL}`);
  console.log('─────────────────────────────────────────');
  verificaApiPhp();
});