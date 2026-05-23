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
/** Utente demo (ospite) presente nel database di esempio */
const UTENTE_DEMO_ID = 'b2000000-0000-0000-0000-000000000002';

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

function testoDisponibilitaAcc(acc) {
  const livello = Number(acc.livello_corrente_kwh) || 0;
  const stato = String(acc.stato_operativo ?? '').toLowerCase();
  if (stato === 'guasto' || stato === 'manutenzione') {
    return { ok: false, testo: 'Non disponibile (manutenzione/guasto)' };
  }
  if (livello <= 0.01) {
    return { ok: false, testo: 'Non disponibile (scarico)' };
  }
  if (stato === 'scarica') {
    return { ok: true, testo: 'In erogazione — energia disponibile' };
  }
  return { ok: true, testo: 'Disponibile per ricarica' };
}

function classeStatoColonnina(stato) {
  if (stato === 'libera') return 'stato-badge--operativo';
  if (stato === 'occupata') return 'stato-badge--manutenzione';
  return 'stato-badge--guasto';
}

function DettaglioAccumulatori({
  stazione,
  accumulatori,
  accumulatoreSelezionatoId,
  onSelezionaAccumulatore,
}) {
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
      <p className="page-subtitle elenco-hint">
        Seleziona un accumulatore per vedere le colonnine compatibili e avviare la ricarica.
      </p>

      {lista.length === 0 ? (
        <p>Nessun accumulatore registrato per questa stazione.</p>
      ) : (
        <div className="accumulatori-grid">
          {lista.map((acc) => {
            const disp = testoDisponibilitaAcc(acc);
            const selezionato =
              String(acc.id_accumulatore) === String(accumulatoreSelezionatoId);

            return (
              <article
                key={acc.id_accumulatore}
                className={
                  selezionato
                    ? 'accumulatore-card accumulatore-card--selected'
                    : 'accumulatore-card'
                }
                onClick={() => onSelezionaAccumulatore(acc.id_accumulatore)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelezionaAccumulatore(acc.id_accumulatore);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <h3 className="accumulatore-card__titolo">
                  {acc.nome ?? `Accumulatore ${acc.id_accumulatore}`}
                </h3>

                <span className={`stato-badge ${classeStato(acc.stato_operativo)}`}>
                  {acc.stato_operativo ?? '—'}
                </span>
                <p
                  className={
                    disp.ok ? 'disp-label disp-label--ok' : 'disp-label disp-label--no'
                  }
                >
                  {disp.testo}
                </p>

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
                      <th>Potenza max scarica</th>
                      <td>{acc.potenza_max_scarica_kw} kW</td>
                    </tr>
                    <tr>
                      <th>Ultimo aggiornamento</th>
                      <td>{formattaData(acc.data_ultimo_aggiornamento)}</td>
                    </tr>
                  </tbody>
                </table>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PannelloColonnine({
  stazione,
  accumulatoreSelezionato,
  colonnine,
  colonnineLoading,
  colonninaSelezionataId,
  onSelezionaColonnina,
  onAvviaSessione,
  sessioneAttiva,
  avvioInCorso,
}) {
  if (!accumulatoreSelezionato) return null;

  return (
    <div className="card card--colonnine">
      <h2 className="section-title">Punti di ricarica</h2>
      <p className="page-subtitle">
        Accumulatore: <strong>{accumulatoreSelezionato.nome}</strong>
        {colonnine?.riepilogo && (
          <>
            {' '}
            · {colonnine.riepilogo.libere} libere · {colonnine.riepilogo.occupate} occupate
          </>
        )}
      </p>

      {colonnineLoading && <p>Caricamento colonnine...</p>}

      {!colonnineLoading && colonnine?.colonnine?.length === 0 && (
        <p>Nessuna colonnina compatibile per questo accumulatore.</p>
      )}

      {!colonnineLoading && colonnine?.colonnine?.length > 0 && (
        <ul className="colonnine-list">
          {colonnine.colonnine.map((col) => {
            const selezionata = col.id_punto === colonninaSelezionataId;
            const disabilitata = !col.utilizzabile || sessioneAttiva;

            return (
              <li
                key={col.id_punto}
                className={
                  selezionata
                    ? 'colonnina-item colonnina-item--selected'
                    : 'colonnina-item'
                }
              >
                <button
                  type="button"
                  className="colonnina-item__btn"
                  disabled={disabilitata}
                  onClick={() => onSelezionaColonnina(col.id_punto)}
                >
                  <strong>{col.identificativo}</strong>
                  <span className={`stato-badge ${classeStatoColonnina(col.stato)}`}>
                    {col.stato}
                  </span>
                  <small>
                    {col.tipo_veicolo} · {col.tipo_connettore} · {col.potenza_max_kw} kW
                  </small>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {colonninaSelezionataId && !sessioneAttiva && (
        <button
          type="button"
          className="btn-primary"
          disabled={avvioInCorso}
          onClick={onAvviaSessione}
        >
          {avvioInCorso ? 'Avvio in corso...' : 'Avvia sessione di ricarica'}
        </button>
      )}
    </div>
  );
}

function PannelloSessione({
  sessioneAttiva,
  statoLive,
  onTermina,
  terminaInCorso,
  messaggio,
}) {
  if (!sessioneAttiva) return null;

  const kwh =
    statoLive?.kwh_erogati ??
    sessioneAttiva.quantita_kwh ??
    0;
  const durata = statoLive?.durata_secondi;

  return (
    <div className="card card--sessione">
      <h2 className="section-title">Sessione attiva</h2>
      {messaggio && <p className="sessione-msg">{messaggio}</p>}
      <table className="data-table">
        <tbody>
          <tr>
            <th>Colonnina</th>
            <td>{sessioneAttiva.identificativo ?? sessioneAttiva.id_punto}</td>
          </tr>
          <tr>
            <th>Sessione</th>
            <td className="mono">{sessioneAttiva.id_sessione}</td>
          </tr>
          <tr>
            <th>Energia erogata</th>
            <td>
              <strong>{Number(kwh).toFixed(3)}</strong> kWh
            </td>
          </tr>
          {durata != null && (
            <tr>
              <th>Durata</th>
              <td>{Math.floor(durata / 60)} min {durata % 60} s</td>
            </tr>
          )}
        </tbody>
      </table>
      <button
        type="button"
        className="btn-danger"
        disabled={terminaInCorso}
        onClick={onTermina}
      >
        {terminaInCorso ? 'Chiusura...' : 'Termina ricarica'}
      </button>
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
  const [accumulatoreSelezionatoId, setAccumulatoreSelezionatoId] = useState(null);
  const [colonnine, setColonnine] = useState(null);
  const [colonnineLoading, setColonnineLoading] = useState(false);
  const [colonninaSelezionataId, setColonninaSelezionataId] = useState(null);
  const [sessioneAttiva, setSessioneAttiva] = useState(null);
  const [statoLive, setStatoLive] = useState(null);
  const [avvioInCorso, setAvvioInCorso] = useState(false);
  const [terminaInCorso, setTerminaInCorso] = useState(false);
  const [messaggioSessione, setMessaggioSessione] = useState(null);
  const [erroreAzione, setErroreAzione] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState(null);

  const stazioneSelezionata =
    stazioni.find((s) => s.id === stazioneSelezionataId) ?? null;

  const accumulatoreSelezionato = accumulatori.find(
    (a) => String(a.id_accumulatore) === String(accumulatoreSelezionatoId)
  );

  async function caricaColonnine(idStazione, idAccumulatore) {
    setColonnineLoading(true);
    setErroreAzione(null);
    try {
      const res = await axios.get(`${API_URL}/colonnine`, {
        params: { id_stazione: idStazione, id_accumulatore: idAccumulatore },
      });
      if (res.data?.status === 'error') {
        throw new Error(res.data.message);
      }
      setColonnine(res.data);
    } catch (err) {
      setColonnine(null);
      setErroreAzione(
        err.response?.data?.message || err.message || 'Errore caricamento colonnine'
      );
    } finally {
      setColonnineLoading(false);
    }
  }

  useEffect(() => {
    async function caricaDati() {
      try {
        setLoading(true);
        setErrore(null);
        setStazioneSelezionataId(null);
        setAccumulatoreSelezionatoId(null);
        setColonninaSelezionataId(null);
        setSessioneAttiva(null);
        setStatoLive(null);

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
    setAccumulatoreSelezionatoId(null);
    setColonninaSelezionataId(null);
    setColonnine(null);
    setErroreAzione(null);
    if (!sessioneAttiva) {
      setMessaggioSessione(null);
    }
  }

  function selezionaAccumulatore(id) {
    const idAcc = String(id);
    setAccumulatoreSelezionatoId(idAcc);
    setColonninaSelezionataId(null);
    setColonnine(null);
    if (stazioneSelezionataId) {
      caricaColonnine(stazioneSelezionataId, idAcc);
    }
  }

  function selezionaColonnina(idPunto) {
    setColonninaSelezionataId(idPunto);
    setErroreAzione(null);
  }

  async function avviaSessione() {
    if (!colonninaSelezionataId || !accumulatoreSelezionatoId) return;
    setAvvioInCorso(true);
    setErroreAzione(null);
    setMessaggioSessione(null);
    try {
      const res = await axios.post(`${API_URL}/sessione/avvia`, {
        id_punto: colonninaSelezionataId,
        id_utente: UTENTE_DEMO_ID,
        id_accumulatore: accumulatoreSelezionatoId,
        metodo_avvio: 'APP',
      });
      if (res.data?.status !== 'success') {
        throw new Error(res.data?.message || 'Avvio sessione fallito');
      }
      const d = res.data.data;
      setSessioneAttiva({
        id_sessione: d.id_sessione,
        id_punto: d.id_punto,
        identificativo: d.identificativo,
      });
      setMessaggioSessione('Simulatore attivo: ricarica in corso.');
      if (d.accumulatore && stazioneSelezionataId) {
        setAccumulatori((prev) =>
          prev.map((a) =>
            String(a.id_accumulatore) === String(d.accumulatore.id_accumulatore)
              ? { ...a, ...d.accumulatore }
              : a
          )
        );
      }
      await caricaColonnine(stazioneSelezionataId, accumulatoreSelezionatoId);
    } catch (err) {
      setErroreAzione(
        err.response?.data?.message || err.message || 'Impossibile avviare la sessione'
      );
    } finally {
      setAvvioInCorso(false);
    }
  }

  async function terminaSessione() {
    if (!sessioneAttiva?.id_sessione) return;
    setTerminaInCorso(true);
    setErroreAzione(null);
    try {
      const res = await axios.post(`${API_URL}/sessione/termina`, {
        id_sessione: sessioneAttiva.id_sessione,
      });
      if (res.data?.status !== 'success') {
        throw new Error(res.data?.message || 'Chiusura sessione fallita');
      }
      const d = res.data.data;
      if (d.accumulatori_stazione?.length && stazioneSelezionataId) {
        setAccumulatori((prev) => {
          const aggiornati = new Map(
            d.accumulatori_stazione.map((a) => [String(a.id_accumulatore), a])
          );
          return prev.map((a) => aggiornati.get(String(a.id_accumulatore)) ?? a);
        });
      } else if (d.accumulatore) {
        setAccumulatori((prev) =>
          prev.map((a) =>
            String(a.id_accumulatore) === String(d.accumulatore.id_accumulatore)
              ? { ...a, ...d.accumulatore }
              : a
          )
        );
      }
      setSessioneAttiva(null);
      setStatoLive(null);
      setColonninaSelezionataId(null);
      setMessaggioSessione(
        `Sessione conclusa: ${d.sessione?.quantita_kwh ?? 0} kWh · € ${d.sessione?.costo_totale ?? 0}`
      );
      if (stazioneSelezionataId && accumulatoreSelezionatoId) {
        await caricaColonnine(stazioneSelezionataId, accumulatoreSelezionatoId);
      }
    } catch (err) {
      setErroreAzione(
        err.response?.data?.message || err.message || 'Impossibile terminare la sessione'
      );
    } finally {
      setTerminaInCorso(false);
    }
  }

  useEffect(() => {
    if (!sessioneAttiva?.id_sessione) return undefined;

    let attivo = true;
    async function poll() {
      try {
        const res = await axios.get(`${API_URL}/sessione/stato`, {
          params: { id_sessione: sessioneAttiva.id_sessione },
        });
        if (!attivo || res.data?.status !== 'success') return;
        const live = res.data.data?.live ?? null;
        const sess = res.data.data?.sessione;
        setStatoLive(live);
        if (sess?.quantita_kwh != null) {
          setSessioneAttiva((prev) =>
            prev ? { ...prev, quantita_kwh: sess.quantita_kwh } : prev
          );
        }
        if (res.data.data?.accumulatore) {
          const acc = res.data.data.accumulatore;
          setAccumulatori((prev) =>
            prev.map((a) =>
              String(a.id_accumulatore) === String(acc.id_accumulatore)
                ? { ...a, ...acc }
                : a
            )
          );
        }
        if (res.data.data?.sessione?.stato === 'terminata') {
          setSessioneAttiva(null);
          setStatoLive(null);
          setMessaggioSessione('Sessione terminata automaticamente.');
        }
      } catch (err) {
        console.warn('poll sessione:', err.message);
      }
    }

    poll();
    const timer = setInterval(poll, 5000);
    return () => {
      attivo = false;
      clearInterval(timer);
    };
  }, [sessioneAttiva?.id_sessione]);

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

      {erroreAzione && <p className="mappa-errore">{erroreAzione}</p>}

      <DettaglioAccumulatori
        stazione={stazioneSelezionata}
        accumulatori={accumulatori}
        accumulatoreSelezionatoId={accumulatoreSelezionatoId}
        onSelezionaAccumulatore={selezionaAccumulatore}
      />

      <PannelloColonnine
        stazione={stazioneSelezionata}
        accumulatoreSelezionato={accumulatoreSelezionato}
        colonnine={colonnine}
        colonnineLoading={colonnineLoading}
        colonninaSelezionataId={colonninaSelezionataId}
        onSelezionaColonnina={selezionaColonnina}
        onAvviaSessione={avviaSessione}
        sessioneAttiva={sessioneAttiva}
        avvioInCorso={avvioInCorso}
      />

      <PannelloSessione
        sessioneAttiva={sessioneAttiva}
        statoLive={statoLive}
        onTermina={terminaSessione}
        terminaInCorso={terminaInCorso}
        messaggio={messaggioSessione}
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