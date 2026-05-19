import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import './App.css';

const API_URL = 'http://localhost:3001/api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function parseCoord(val) {
  if (val == null || val === '') return NaN;
  const n = parseFloat(String(val).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

function parseJsonArray(dati) {
  let lista = dati;
  if (typeof lista === 'string') {
    lista = JSON.parse(lista);
  }
  return Array.isArray(lista) ? lista : [];
}

function normalizzaStazioni(dati) {
  return parseJsonArray(dati)
    .map((s) => {
      const lat = parseCoord(s.latitudine);
      const lng = parseCoord(s.longitudine);

      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        return null;
      }

      return {
        id: String(s.id_stazione),
        nome: s.nome ?? '',
        indirizzo: s.indirizzo ?? '',
        lat,
        lng,
        numAccumulatori: 0,
      };
    })
    .filter(Boolean);
}

function contaAccumulatoriPerStazione(accumulatori) {
  const conteggi = new Map();

  for (const acc of parseJsonArray(accumulatori)) {
    const id = String(acc.id_stazione);
    conteggi.set(id, (conteggi.get(id) ?? 0) + 1);
  }

  return conteggi;
}

function unisciStazioniConAccumulatori(stazioni, conteggi) {
  return stazioni.map((s) => ({
    ...s,
    numAccumulatori: conteggi.get(s.id) ?? 0,
  }));
}

function accumulatoriPerStazione(accumulatori, idStazione) {
  const id = String(idStazione);
  return parseJsonArray(accumulatori).filter(
    (acc) => String(acc.id_stazione) === id
  );
}

function testoAccumulatori(n) {
  if (n === 1) return '1 accumulatore';
  return `${n} accumulatori`;
}

function formattaData(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

function classeStato(stato) {
  const s = String(stato ?? '').toLowerCase();
  if (s.includes('operativ') || s === 'attivo') return 'stato-badge--operativo';
  if (s.includes('manuten')) return 'stato-badge--manutenzione';
  if (s.includes('guast') || s.includes('errore') || s.includes('offline')) {
    return 'stato-badge--guasto';
  }
  return 'stato-badge--default';
}

function DettaglioAccumulatori({ stazione, accumulatori }) {
  if (!stazione) {
    return (
      <div className="card card--dettaglio">
        <p className="page-subtitle" style={{ margin: 0 }}>
          Seleziona una stazione dall&apos;elenco per vedere lo stato degli accumulatori.
        </p>
      </div>
    );
  }

  const lista = accumulatoriPerStazione(accumulatori, stazione.id);

  return (
    <div className="card card--dettaglio">
      <h2 className="section-title">{stazione.nome}</h2>
      <p className="page-subtitle dettaglio-indirizzo">
        {stazione.indirizzo} · {testoAccumulatori(lista.length)}
      </p>

      {lista.length === 0 ? (
        <p>Nessun accumulatore registrato per questa stazione.</p>
      ) : (
        <div className="accumulatori-grid">
          {lista.map((acc) => (
            <article key={acc.id_accumulatore} className="accumulatore-card">
              <h3 className="accumulatore-card__titolo">
                {acc.nome ?? `Accumulatore ${acc.id_accumulatore}`}
              </h3>

              <span className={`stato-badge ${classeStato(acc.stato_operativo)}`}>
                {acc.stato_operativo ?? '—'}
              </span>

              <div className="xp-bar">
                <div
                  className="xp-bar__fill"
                  style={{
                    width: `${Math.min(100, Math.max(0, Number(acc.percentuale_carica) || 0))}%`,
                  }}
                />
              </div>
              <p className="accumulatore-card__carica">
                Carica: <strong>{acc.percentuale_carica ?? 0}%</strong>
                {' '}
                ({acc.livello_corrente_kwh ?? 0} /{' '}
                {acc.capacita_utilizzabile_kwh ?? acc.capacita_totale_kwh ?? 0} kWh)
              </p>

              <table className="data-table">
                <tbody>
                  <tr>
                    <th>Capacità totale</th>
                    <td>{acc.capacita_totale_kwh} kWh</td>
                  </tr>
                  <tr>
                    <th>Capacità utilizzabile</th>
                    <td>{acc.capacita_utilizzabile_kwh} kWh</td>
                  </tr>
                  <tr>
                    <th>Potenza max carica</th>
                    <td>{acc.potenza_max_carica_kw} kW</td>
                  </tr>
                  <tr>
                    <th>Potenza max scarica</th>
                    <td>{acc.potenza_max_scarica_kw} kW</td>
                  </tr>
                  <tr>
                    <th>Soglie min / max</th>
                    <td>
                      {acc.soglia_minima_perc}% – {acc.soglia_massima_perc}%
                    </td>
                  </tr>
                  <tr>
                    <th>Ultimo aggiornamento</th>
                    <td>{formattaData(acc.data_ultimo_aggiornamento)}</td>
                  </tr>
                </tbody>
              </table>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar__brand">GreenSchool</Link>
      <Link to="/" className="navbar__link">Dashboard</Link>
      <Link to="/storico" className="navbar__link">Storico</Link>
      <Link to="/mappa" className="navbar__link">Mappa</Link>
      <Link to="/scuola" className="navbar__link">Scuola</Link>
      <Link to="/game" className="navbar__link">Gamification</Link>
      <Link to="/admin" className="navbar__link">Admin</Link>
    </nav>
  );
}

function PlaceholderPagina({ titolo }) {
  return (
    <div>
      <h1 className="page-title">{titolo}</h1>
      <p className="page-subtitle">Sezione in preparazione.</p>
      <div className="card" />
    </div>
  );
}

function Dashboard() {
  return <PlaceholderPagina titolo="Dashboard" />;
}

function Storico() {
  return <PlaceholderPagina titolo="Storico sessioni" />;
}

function Scuola() {
  return <PlaceholderPagina titolo="Scuola & Green School" />;
}

function Gamification() {
  return <PlaceholderPagina titolo="Gamification" />;
}

function Admin() {
  return <PlaceholderPagina titolo="Pannello Admin" />;
}

function Mappa() {
  const [stazioni, setStazioni] = useState([]);
  const [accumulatori, setAccumulatori] = useState([]);
  const [stazioneSelezionataId, setStazioneSelezionataId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState(null);

  const stazioneSelezionata =
    stazioni.find((s) => s.id === stazioneSelezionataId) ?? null;

  useEffect(() => {
    async function caricaDati() {
      try {
        setLoading(true);
        setErrore(null);
        setStazioneSelezionataId(null);

        const [resStazioni, resAccumulatori] = await Promise.all([
          axios.get(`${API_URL}/stazioniVicine`),
          axios.get(`${API_URL}/accumulatori`),
        ]);

        if (resStazioni.data?.errore) {
          throw new Error(resStazioni.data.errore);
        }
        if (resAccumulatori.data?.errore) {
          throw new Error(resAccumulatori.data.errore);
        }

        const stazioniBase = normalizzaStazioni(resStazioni.data);

        if (stazioniBase.length === 0) {
          setErrore('Nessuna stazione con coordinate valide.');
          setStazioni([]);
          setAccumulatori([]);
          return;
        }

        const conteggi = contaAccumulatoriPerStazione(resAccumulatori.data);
        const stazioniComplete = unisciStazioniConAccumulatori(
          stazioniBase,
          conteggi
        );

        setAccumulatori(parseJsonArray(resAccumulatori.data));
        setStazioni(stazioniComplete);
      } catch (err) {
        console.error(err);
        setErrore(
          err.response?.data?.errore ||
            err.message ||
            'Impossibile caricare mappa e accumulatori.'
        );
        setStazioni([]);
        setAccumulatori([]);
      } finally {
        setLoading(false);
      }
    }

    caricaDati();
  }, []);

  function selezionaStazione(id) {
    setStazioneSelezionataId(String(id));
  }

  if (loading) {
    return (
      <div>
        <h1 className="page-title">Mappa stazioni</h1>
        <p className="page-subtitle">Caricamento...</p>
      </div>
    );
  }

  if (errore) {
    return (
      <div>
        <h1 className="page-title">Mappa stazioni</h1>
        <p className="mappa-errore">{errore}</p>
      </div>
    );
  }

  const centerLat =
    stazioni.reduce((sum, s) => sum + s.lat, 0) / stazioni.length;
  const centerLng =
    stazioni.reduce((sum, s) => sum + s.lng, 0) / stazioni.length;

  const totaleAccumulatori = stazioni.reduce(
    (sum, s) => sum + s.numAccumulatori,
    0
  );

  return (
    <div>
      <h1 className="page-title">Mappa stazioni</h1>
      <p className="page-subtitle">
        {stazioni.length} stazioni · {totaleAccumulatori} accumulatori totali
      </p>

      <div className="map-container">
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {stazioni.map((s) => (
            <Marker key={s.id} position={[s.lat, s.lng]}>
              <Popup>
                <strong>{s.nome}</strong>
                <br />
                {s.indirizzo}
                <br />
                <strong>{testoAccumulatori(s.numAccumulatori)}</strong>
                <br />
                <button
                  type="button"
                  className="btn-dettaglio-popup"
                  onClick={() => selezionaStazione(s.id)}
                >
                  Vedi dettagli accumulatori
                </button>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="card">
        <h2 className="section-title">Elenco stazioni</h2>
        <p className="page-subtitle elenco-hint">
          Clicca una stazione per vedere i dettagli sotto.
        </p>
        <ul className="station-list">
          {stazioni.map((s) => (
            <li
              key={s.id}
              className={
                s.id === stazioneSelezionataId
                  ? 'station-item station-item--selected'
                  : 'station-item'
              }
              onClick={() => selezionaStazione(s.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  selezionaStazione(s.id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div>
                <strong>{s.nome}</strong>
                <br />
                <small>{s.indirizzo}</small>
                <br />
                <small>{testoAccumulatori(s.numAccumulatori)}</small>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <DettaglioAccumulatori
        stazione={stazioneSelezionata}
        accumulatori={accumulatori}
      />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/storico" element={<Storico />} />
            <Route path="/mappa" element={<Mappa />} />
            <Route path="/scuola" element={<Scuola />} />
            <Route path="/game" element={<Gamification />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;