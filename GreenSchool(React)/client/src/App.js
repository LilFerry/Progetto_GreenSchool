import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { AuthProvider, useAuth } from './AuthContext';
import { SessionProvider, useSession } from './SessionContext';
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

function statoAccumulatoreVisibile(acc) {
  const stato = String(acc.stato_operativo ?? '').toLowerCase();
  if (['guasto', 'manutenzione', 'scarica', 'carica'].includes(stato)) {
    return stato;
  }
  const perc = Number(acc.percentuale_carica) || 0;
  const soglia = Number(acc.soglia_minima_perc) ?? 0;
  return perc > soglia ? 'attivo' : 'offline';
}

function testoDisponibilitaAcc(acc) {
  const livello = Number(acc.livello_corrente_kwh) || 0;
  const stato = statoAccumulatoreVisibile(acc);
  const soglia = Number(acc.soglia_minima_perc) ?? 0;
  if (stato === 'guasto' || stato === 'manutenzione') {
    return { ok: false, testo: 'Non disponibile (manutenzione/guasto)' };
  }
  if (stato === 'offline' || livello <= 0.01) {
    return {
      ok: false,
      testo: `Non disponibile (sotto soglia minima ${soglia}%)`,
    };
  }
  if (stato === 'scarica') {
    return { ok: true, testo: 'In erogazione — energia disponibile' };
  }
  return { ok: true, testo: 'Disponibile per ricarica' };
}

function classeStatoColonnina(stato) {
  if (stato === 'libera') return 'stato-badge--libera';
  if (stato === 'occupata') return 'stato-badge--occupata';
  if (stato === 'offline') return 'stato-badge--offline';
  return 'stato-badge--fuori_servizio';
}

/** Centra la mappa sulla stazione senza rimontare MapContainer */
function CentraMappaSuStazione({ lat, lng, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
      return;
    }
    map.flyTo([lat, lng], zoom, { duration: 0.45 });
  }, [lat, lng, zoom, map]);
  return null;
}

function TabellaStazioni({ stazioni, stazioneSelezionataId, onSeleziona, disabilitata }) {
  if (stazioni.length === 0) return null;

  return (
    <div className="card card--stazioni-riga">
      <h2 className="section-title">Stazioni</h2>
      <p className="page-subtitle elenco-hint">
        Clicca una stazione per vedere gli accumulatori disponibili.
      </p>
      <div className="stazioni-riga-scroll">
        <table className="stazioni-tabella">
          <tbody>
            <tr>
              {stazioni.map((s) => {
                const selezionata =
                  String(s.id) === String(stazioneSelezionataId ?? '');
                return (
                  <td
                    key={s.id}
                    className={
                      selezionata
                        ? 'stazioni-tabella__cell stazioni-tabella__cell--selected'
                        : 'stazioni-tabella__cell'
                    }
                  >
                    <button
                      type="button"
                      className="stazioni-tabella__btn"
                      disabled={disabilitata}
                      onClick={() => onSeleziona(s.id)}
                    >
                      <span className="stazioni-tabella__nome">{s.nome}</span>
                      <span className="stazioni-tabella__meta">{s.indirizzo}</span>
                      <span className="stazioni-tabella__badge">
                        {testoAccumulatori(s.numAccumulatori)}
                      </span>
                    </button>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ListaAccumulatori({
  stazione,
  accumulatori,
  accumulatoreSelezionatoId,
  onSeleziona,
  compatto,
}) {
  const lista = accumulatoriPerStazione(accumulatori, stazione.id);

  return (
    <div className={`card card--accumulatori-riga${compatto ? ' card--step-compatto' : ''}`}>
      <h2 className="section-title">Accumulatori</h2>
      <p className="page-subtitle elenco-hint">
        {compatto
          ? 'Clicca un altro accumulatore per cambiare colonnina'
          : `${testoAccumulatori(lista.length)} · scegli dove prelevare energia`}
      </p>

      {lista.length === 0 ? (
        <p>Nessun accumulatore per questa stazione.</p>
      ) : (
        <div className="accumulatori-riga-scroll">
          <table className="accumulatori-tabella">
            <tbody>
              <tr>
                {lista.map((acc) => {
                  const statoVis = statoAccumulatoreVisibile(acc);
                  const disp = testoDisponibilitaAcc(acc);
                  const perc = Math.min(100, Math.max(0, Number(acc.percentuale_carica) || 0));
                  const selezionato =
                    String(acc.id_accumulatore) === String(accumulatoreSelezionatoId);
                  return (
                    <td key={acc.id_accumulatore} className="accumulatori-tabella__cell">
                      <button
                        type="button"
                        className={
                          selezionato
                            ? 'accumulatore-riga-card accumulatore-riga-card--selected'
                            : 'accumulatore-riga-card'
                        }
                        onClick={() => onSeleziona(acc.id_accumulatore)}
                      >
                        <strong>{acc.nome ?? 'Accumulatore'}</strong>
                        <span className={`stato-badge ${classeStato(statoVis)}`}>
                          {statoVis}
                        </span>
                        <div className="xp-bar xp-bar--compact">
                          <div className="xp-bar__fill" style={{ width: `${perc}%` }} />
                        </div>
                        <span className="accumulatore-riga-card__perc">{perc}%</span>
                        <small className={disp.ok ? 'disp-label--ok' : 'disp-label--no'}>
                          {disp.testo}
                        </small>
                      </button>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PannelloColonnine({
  colonnine,
  colonnineLoading,
  colonninaSelezionataId,
  onSelezionaColonnina,
  onAvviaSessione,
  avvioInCorso,
  soloLettura = false,
}) {
  return (
    <div className="card card--colonnine">
      <h2 className="section-title">Punti di ricarica</h2>
      <p className="page-subtitle elenco-hint">
        {colonnine?.riepilogo ? (
          <>
            {colonnine.riepilogo.libere} libere · {colonnine.riepilogo.occupate} occupate
            {colonnine.riepilogo.offline > 0 && ` · ${colonnine.riepilogo.offline} offline`}
          </>
        ) : soloLettura ? (
          'Stato colonnine (solo visualizzazione)'
        ) : (
          'Seleziona una colonnina e avvia la ricarica'
        )}
      </p>

      {colonnineLoading && <p>Caricamento colonnine...</p>}

      {!colonnineLoading && colonnine?.colonnine?.length === 0 && (
        <p>Nessuna colonnina compatibile per questo accumulatore.</p>
      )}

      {!colonnineLoading && colonnine?.colonnine?.length > 0 && (
        <div className="colonnine-riga-scroll">
          <table className="colonnine-tabella">
            <tbody>
              <tr>
                {colonnine.colonnine.map((col) => {
                  const selezionata = col.id_punto === colonninaSelezionataId;
                  const disabilitata = !col.utilizzabile;

                  return (
                    <td key={col.id_punto} className="colonnine-tabella__cell">
                      <button
                        type="button"
                        className={
                          selezionata
                            ? 'colonnina-riga-card colonnina-riga-card--selected'
                            : 'colonnina-riga-card'
                        }
                        disabled={soloLettura || disabilitata}
                        onClick={() => {
                          if (!soloLettura) onSelezionaColonnina(col.id_punto);
                        }}
                      >
                        <strong>{col.identificativo}</strong>
                        <span className={`stato-badge ${classeStatoColonnina(col.stato)}`}>
                          {col.stato}
                        </span>
                        <small>
                          {col.tipo_veicolo} · {col.tipo_connettore}
                        </small>
                        <small>{col.potenza_max_kw} kW</small>
                      </button>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {!soloLettura && colonninaSelezionataId && (
        <button
          type="button"
          className="btn-primary btn-primary--wide"
          disabled={avvioInCorso}
          onClick={onAvviaSessione}
        >
          {avvioInCorso ? 'Avvio in corso...' : 'Avvia sessione di ricarica'}
        </button>
      )}
    </div>
  );
}

function BarraXp({ profilo }) {
  if (!profilo) return null;
  const pct = Number(profilo.percentuale_livello ?? 0);
  return (
    <div className="xp-bar-wrap">
      <div className="xp-bar-meta">
        <span className="xp-bar-livello">Livello {profilo.livello}</span>
        <span className="xp-bar-testo">
          {profilo.xp_nel_livello} / {profilo.xp_per_prossimo_livello} XP
        </span>
      </div>
      <div className="xp-bar-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="xp-bar-totale">{profilo.xp_totale} XP totali</p>
    </div>
  );
}

function ModalGuadagnoXp({ reward, onContinua }) {
  const [displayXp, setDisplayXp] = useState(0);

  useEffect(() => {
    if (!reward?.xp_guadagnati) return undefined;
    const target = reward.xp_guadagnati;
    const steps = 28;
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      setDisplayXp(Math.round((target * step) / steps));
      if (step >= steps) clearInterval(timer);
    }, 35);
    return () => clearInterval(timer);
  }, [reward?.xp_guadagnati]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onContinua();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onContinua]);

  if (!reward || !reward.xp_guadagnati) return null;

  const missioni = reward.missioni_completate ?? [];

  return (
    <div
      className="modal-overlay modal-overlay--xp"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-xp-titolo"
      onClick={onContinua}
    >
      <div className="modal-card modal-card--xp" onClick={(e) => e.stopPropagation()}>
        <div className="xp-celebration">
          <span className="xp-celebration__icon" aria-hidden="true">
            ⚡
          </span>
          <h2 id="modal-xp-titolo" className="xp-celebration__titolo">
            +{displayXp} XP
          </h2>
          <p className="xp-celebration__sottotitolo">Ottimo lavoro! Ricarica completata.</p>
        </div>

        <ul className="xp-breakdown">
          <li>
            <span>Ricarica</span>
            <strong>+{reward.xp_ricarica ?? 0} XP</strong>
          </li>
          {(reward.xp_bonus_missioni ?? 0) > 0 && (
            <li>
              <span>Missioni giornaliere</span>
              <strong>+{reward.xp_bonus_missioni} XP</strong>
            </li>
          )}
        </ul>

        {missioni.length > 0 && (
          <div className="xp-missioni-bonus">
            <p className="xp-missioni-bonus__titolo">Missione completata!</p>
            <ul>
              {missioni.map((m) => (
                <li key={m.codice}>
                  {m.titolo} <span>+{m.xp_bonus} XP</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {reward.livello_salito && (
          <p className="xp-level-up">
            🎉 Sei salito al livello <strong>{reward.livello}</strong>!
          </p>
        )}

        {reward.profilo && <BarraXp profilo={reward.profilo} />}

        <button type="button" className="btn-primary btn-primary--wide" onClick={onContinua}>
          Vedi riepilogo ricarica
        </button>
      </div>
    </div>
  );
}

function ListaMissioniGiornaliere({ missioni }) {
  if (!missioni?.length) return null;
  return (
    <div className="card missioni-card">
      <h2 className="section-title">Missioni giornaliere</h2>
      <p className="page-subtitle">Si azzerano a mezzanotte. Completa le sfide per XP bonus.</p>
      <ul className="missioni-lista">
        {missioni.map((m) => (
          <li
            key={m.codice}
            className={`missione-item${m.completata ? ' missione-item--completata' : ''}`}
          >
            <div className="missione-item__testa">
              <strong>{m.titolo}</strong>
              <span className="missione-item__bonus">+{m.xp_bonus} XP</span>
            </div>
            <p className="missione-item__desc">{m.descrizione}</p>
            <div className="missione-item__barra">
              <div
                className="missione-item__fill"
                style={{ width: `${m.percentuale}%` }}
              />
            </div>
            <p className="missione-item__prog">
              {m.completata ? (
                <span className="missione-item__ok">Completata ✓</span>
              ) : (
                <>
                  {m.progresso.toFixed(m.unita === 'kWh' ? 2 : 0)} / {m.target}{' '}
                  {m.unita}
                </>
              )}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ModalRiepilogo({ riepilogo, stazioneNome, onChiudi }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onChiudi();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onChiudi]);

  if (!riepilogo) return null;

  const kwh = Number(riepilogo.quantita_kwh ?? 0);
  const costo = Number(riepilogo.costo_totale ?? 0);
  const minuti = riepilogo.durata_minuti;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-riepilogo-titolo"
      onClick={onChiudi}
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 id="modal-riepilogo-titolo" className="section-title">
          Ricarica completata
        </h2>
        <p className="page-subtitle">Ecco il resoconto della sessione.</p>
        <table className="data-table">
          <tbody>
            {stazioneNome && (
              <tr>
                <th>Stazione</th>
                <td>{stazioneNome}</td>
              </tr>
            )}
            <tr>
              <th>Colonnina</th>
              <td>{riepilogo.identificativo ?? riepilogo.id_punto}</td>
            </tr>
            <tr>
              <th>Energia erogata</th>
              <td>
                <strong>{kwh.toFixed(3)}</strong> kWh
              </td>
            </tr>
            {minuti != null && (
              <tr>
                <th>Durata</th>
                <td>
                  {minuti} min
                  {riepilogo.durata_secondi != null && (
                    <> ({riepilogo.durata_secondi % 60} s)</>
                  )}
                </td>
              </tr>
            )}
            <tr>
              <th>Totale</th>
              <td>
                <strong>€ {costo.toFixed(2)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
        <button type="button" className="btn-primary btn-primary--wide" onClick={onChiudi}>
          Chiudi
        </button>
      </div>
    </div>
  );
}

function PannelloSessione({
  sessioneAttiva,
  statoLive,
  onTermina,
  terminaInCorso,
  messaggio,
  compatto = false,
}) {
  const [durataSecondi, setDurataSecondi] = useState(null);

  useEffect(() => {
    if (!sessioneAttiva?.id_sessione) {
      setDurataSecondi(null);
      return undefined;
    }

    const inizioMs = sessioneAttiva.data_inizio
      ? new Date(sessioneAttiva.data_inizio).getTime()
      : sessioneAttiva.avviataIl ?? Date.now();

    function aggiornaDurata() {
      setDurataSecondi(Math.max(0, Math.floor((Date.now() - inizioMs) / 1000)));
    }

    aggiornaDurata();
    const timer = setInterval(aggiornaDurata, 1000);
    return () => clearInterval(timer);
  }, [
    sessioneAttiva?.id_sessione,
    sessioneAttiva?.data_inizio,
    sessioneAttiva?.avviataIl,
  ]);

  if (!sessioneAttiva) return null;

  const kwh =
    statoLive?.kwh_erogati ??
    sessioneAttiva.quantita_kwh ??
    0;

  return (
    <div
      className={
        compatto
          ? 'card card--sessione card--sessione-compact'
          : 'card card--sessione card--sessione-focus'
      }
    >
      <h2 className="section-title">
        {compatto ? 'Ricarica in corso' : 'Sessione di ricarica in corso'}
      </h2>
      {messaggio && <p className="sessione-msg">{messaggio}</p>}
      <table className="data-table">
        <tbody>
          {sessioneAttiva.nome_stazione && (
            <tr>
              <th>Stazione</th>
              <td>{sessioneAttiva.nome_stazione}</td>
            </tr>
          )}
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
          {durataSecondi != null && (
            <tr>
              <th>Durata</th>
              <td>
                {Math.floor(durataSecondi / 60)} min {durataSecondi % 60} s
              </td>
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
  const { utente, isAdmin, logout } = useAuth();
  const location = useLocation();

  function linkClass(path) {
    return location.pathname === path ? 'navbar__link navbar__link--active' : 'navbar__link';
  }

  return (
    <nav className="navbar">
      <Link to={isAdmin ? '/admin' : '/'} className="navbar__brand">
        GreenSchool
      </Link>
      {isAdmin ? (
        <>
          <Link to="/mappa" className={linkClass('/mappa')}>Mappa</Link>
          <Link to="/admin" className={linkClass('/admin')}>Admin</Link>
        </>
      ) : (
        <>
          <Link to="/" className={linkClass('/')}>Dashboard</Link>
          <Link to="/mappa" className={linkClass('/mappa')}>Mappa</Link>
          <Link to="/game" className={linkClass('/game')}>Classifica</Link>
          <Link to="/storico" className={linkClass('/storico')}>Storico</Link>
          <Link to="/scuola" className={linkClass('/scuola')}>Scuola</Link>
        </>
      )}
      <div className="navbar__user">
        <span className="navbar__user-name">
          {utente?.nome} {utente?.cognome}
          {isAdmin && <span className="navbar__badge">Admin</span>}
        </span>
        <button type="button" className="navbar__logout" onClick={logout}>
          Esci
        </button>
      </div>
    </nav>
  );
}

function PaginaAuth() {
  const { login } = useAuth();
  const [modalita, setModalita] = useState('login');
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState(null);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({
    nome: '',
    cognome: '',
    email: '',
    password: '',
    cellulare: '',
  });

  async function handleLogin(e) {
    e.preventDefault();
    setInvio(true);
    setErrore(null);
    try {
      const res = await axios.post(`${API_URL}/auth/login`, loginForm);
      if (res.status >= 400 || res.data?.status !== 'success') {
        throw new Error(res.data?.message || 'Login fallito');
      }
      login(res.data.data.utente);
    } catch (err) {
      setErrore(err.response?.data?.message || err.message || 'Accesso non riuscito');
    } finally {
      setInvio(false);
    }
  }

  async function handleRegistra(e) {
    e.preventDefault();
    setInvio(true);
    setErrore(null);
    try {
      const res = await axios.post(`${API_URL}/auth/registra`, regForm);
      if (res.status >= 400 || res.data?.status !== 'success') {
        throw new Error(res.data?.message || 'Registrazione fallita');
      }
      login(res.data.data.utente);
    } catch (err) {
      setErrore(err.response?.data?.message || err.message || 'Registrazione non riuscita');
    } finally {
      setInvio(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <h1 className="page-title">GreenSchool</h1>
        <p className="page-subtitle">Accedi o crea un account per usare le stazioni di ricarica</p>

        <div className="auth-tabs">
          <button
            type="button"
            className={modalita === 'login' ? 'auth-tab auth-tab--active' : 'auth-tab'}
            onClick={() => { setModalita('login'); setErrore(null); }}
          >
            Accedi
          </button>
          <button
            type="button"
            className={modalita === 'registra' ? 'auth-tab auth-tab--active' : 'auth-tab'}
            onClick={() => { setModalita('registra'); setErrore(null); }}
          >
            Registrati
          </button>
        </div>

        {errore && <p className="mappa-errore">{errore}</p>}

        {modalita === 'login' ? (
          <form className="auth-form" onSubmit={handleLogin}>
            <label>
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                autoComplete="current-password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              />
            </label>
            <button type="submit" className="btn-primary" disabled={invio}>
              {invio ? 'Accesso...' : 'Entra'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegistra}>
            <label>
              Nome
              <input
                type="text"
                required
                value={regForm.nome}
                onChange={(e) => setRegForm({ ...regForm, nome: e.target.value })}
              />
            </label>
            <label>
              Cognome
              <input
                type="text"
                required
                value={regForm.cognome}
                onChange={(e) => setRegForm({ ...regForm, cognome: e.target.value })}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={regForm.email}
                onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
              />
            </label>
            <label>
              Cellulare <span className="auth-optional">(opzionale)</span>
              <input
                type="tel"
                value={regForm.cellulare}
                onChange={(e) => setRegForm({ ...regForm, cellulare: e.target.value })}
              />
            </label>
            <label>
              Password <span className="auth-optional">(min. 6 caratteri)</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={regForm.password}
                onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
              />
            </label>
            <button type="submit" className="btn-primary" disabled={invio}>
              {invio ? 'Registrazione...' : 'Crea account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function RequireAdmin({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function SoloUtente({ children }) {
  const { isAdmin } = useAuth();
  if (isAdmin) {
    return <Navigate to="/mappa" replace />;
  }
  return children;
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

function SessionModals() {
  const {
    xpReward,
    chiudiXpMostraRiepilogo,
    riepilogoSessione,
    stazioneRiepilogo,
    chiudiRiepilogo,
  } = useSession();

  return (
    <>
      <ModalGuadagnoXp reward={xpReward} onContinua={chiudiXpMostraRiepilogo} />
      <ModalRiepilogo
        riepilogo={xpReward ? null : riepilogoSessione}
        stazioneNome={stazioneRiepilogo}
        onChiudi={chiudiRiepilogo}
      />
    </>
  );
}

function ListaRicaricheInCorso() {
  const {
    sessioniAttive,
    statoLiveMap,
    terminaSessione,
    terminaInCorsoId,
    erroreSessione,
  } = useSession();

  if (!sessioniAttive.length) return null;

  return (
    <div className="card card--sessioni-attive">
      <h2 className="section-title">Ricariche in corso</h2>
      <p className="page-subtitle sessioni-attive-hint">
        Puoi avviare altre ricariche sulla mappa, su colonnine libere. Energia aggiornata ogni 5
        secondi.
      </p>
      {erroreSessione && <p className="mappa-errore">{erroreSessione}</p>}
      <div className="sessioni-attive-list">
        {sessioniAttive.map((s) => (
          <PannelloSessione
            key={s.id_sessione}
            compatto
            sessioneAttiva={s}
            statoLive={statoLiveMap[s.id_sessione]}
            onTermina={() => terminaSessione(s.id_sessione, s.id_accumulatore)}
            terminaInCorso={terminaInCorsoId === s.id_sessione}
          />
        ))}
      </div>
      <Link to="/mappa" className="btn-secondary btn-secondary--inline">
        Avvia un&apos;altra ricarica sulla mappa →
      </Link>
    </div>
  );
}

function Dashboard() {
  const { utente } = useAuth();
  const { haSessioniAttive } = useSession();
  const [profilo, setProfilo] = useState(null);
  const [missioni, setMissioni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    if (!utente?.id_utente) return undefined;

    async function carica() {
      setLoading(true);
      setErrore(null);
      try {
        const res = await axios.get(`${API_URL}/gamification/profilo`, {
          params: { id_utente: utente.id_utente },
        });
        if (res.status >= 400 || res.data?.status !== 'success') {
          throw new Error(res.data?.message || 'Gamification non disponibile');
        }
        setProfilo(res.data.data.profilo);
        setMissioni(res.data.data.missioni_oggi ?? []);
      } catch (err) {
        setErrore(
          err.response?.data?.message || err.message || 'Impossibile caricare le sfide.'
        );
        setProfilo(null);
        setMissioni([]);
      } finally {
        setLoading(false);
      }
    }
    carica();
  }, [utente?.id_utente]);

  return (
    <div className="dashboard-gamification">
      <h1 className="page-title">Le tue sfide</h1>
      <p className="page-subtitle">
        Guadagna XP completando ricariche sulla mappa. Salire di livello sblocca il primato in
        classifica.
      </p>

      {loading && <p>Caricamento profilo...</p>}
      {errore && (
        <p className="mappa-errore">
          {errore}
          <br />
          <small>
            Se il database è già attivo, esegui{' '}
            <code>database.sql</code> e sincronizza le API PHP.
          </small>
        </p>
      )}

      {!loading && profilo && (
        <>
          <div className="card card--xp-summary">
            <div className="xp-summary-header">
              <span className="xp-summary-badge">Liv. {profilo.livello}</span>
              <div>
                <p className="xp-summary-stat">
                  <strong>{profilo.ricariche_completate}</strong> ricariche
                </p>
                <p className="xp-summary-stat">
                  <strong>{Number(profilo.kwh_totali).toFixed(1)}</strong> kWh totali
                </p>
              </div>
            </div>
            <BarraXp profilo={profilo} />
            <Link to="/game" className="btn-secondary btn-secondary--inline">
              Vedi classifica utenti →
            </Link>
          </div>
          <ListaMissioniGiornaliere missioni={missioni} />
          {haSessioniAttive ? (
            <ListaRicaricheInCorso />
          ) : (
            <div className="card">
              <h2 className="section-title">Prossimo passo</h2>
              <p className="page-subtitle" style={{ marginTop: 0 }}>
                Avvia una ricarica dalla mappa per guadagnare XP e avanzare nelle missioni di oggi.
              </p>
              <Link to="/mappa" className="btn-primary">
                Vai alla mappa
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Classifica() {
  const { utente } = useAuth();
  const [classifica, setClassifica] = useState([]);
  const [miaPosizione, setMiaPosizione] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    if (!utente?.id_utente) return undefined;

    async function carica() {
      setLoading(true);
      setErrore(null);
      try {
        const res = await axios.get(`${API_URL}/gamification/classifica`, {
          params: { limite: 50, id_utente: utente.id_utente },
        });
        if (res.status >= 400 || res.data?.status !== 'success') {
          throw new Error(res.data?.message || 'Errore classifica');
        }
        setClassifica(res.data.data.classifica ?? []);
        setMiaPosizione(res.data.data.mia_posizione ?? null);
      } catch (err) {
        setErrore(err.response?.data?.message || err.message || 'Classifica non disponibile.');
        setClassifica([]);
      } finally {
        setLoading(false);
      }
    }
    carica();
  }, [utente?.id_utente]);

  return (
    <div>
      <h1 className="page-title">Classifica utenti</h1>
      <p className="page-subtitle">
        Tutti gli utenti ordinati per XP totali.
      </p>

      {loading && <p>Caricamento...</p>}
      {errore && <p className="mappa-errore">{errore}</p>}

      {miaPosizione && (
        <div className="card card--mia-posizione">
          <p>
            La tua posizione: <strong>#{miaPosizione.posizione}</strong>
            {miaPosizione.fuori_top && ' (fuori dalla top 50)'}
          </p>
          <p>
            {miaPosizione.xp_totale} XP · Livello {miaPosizione.livello} ·{' '}
            {miaPosizione.ricariche_completate} ricariche
          </p>
        </div>
      )}

      {!loading && !errore && classifica.length === 0 && (
        <p>Nessun punteggio ancora. Sii il primo a ricaricare!</p>
      )}

      {!loading && classifica.length > 0 && (
        <div className="card card--classifica-scroll">
          <table className="data-table data-table--classifica">
            <thead>
              <tr>
                <th>#</th>
                <th>Utente</th>
                <th>Livello</th>
                <th>XP</th>
                <th>Ricariche</th>
                <th>kWh</th>
              </tr>
            </thead>
            <tbody>
              {classifica.map((r) => {
                const sonoIo = r.id_utente === utente?.id_utente;
                return (
                  <tr
                    key={r.id_utente}
                    className={sonoIo ? 'classifica-row--io' : undefined}
                  >
                    <td>
                      {r.posizione <= 3 ? (
                        <span className={`classifica-medaglia classifica-medaglia--${r.posizione}`}>
                          {r.posizione}
                        </span>
                      ) : (
                        r.posizione
                      )}
                    </td>
                    <td>
                      <strong>{r.nome_visualizzato}</strong>
                      {sonoIo && <span className="classifica-tu"> (tu)</span>}
                    </td>
                    <td>{r.livello}</td>
                    <td>
                      <strong>{r.xp_totale}</strong>
                    </td>
                    <td>{r.ricariche_completate}</td>
                    <td>{r.kwh_totali}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function etichettaStatoRicarica(stato) {
  if (stato === 'in_corso') return 'In corso';
  if (stato === 'annullata') return 'Annullata';
  return 'Conclusa';
}

function Storico() {
  const { utente } = useAuth();
  const [sessioni, setSessioni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    if (!utente?.id_utente) return undefined;

    async function carica() {
      setLoading(true);
      setErrore(null);
      try {
        const res = await axios.get(`${API_URL}/sessioni`, {
          params: { limite: 200, id_utente: utente.id_utente },
        });
        if (res.data?.status !== 'success') {
          throw new Error(res.data?.message || 'Errore caricamento storico');
        }
        setSessioni(res.data.data ?? []);
      } catch (err) {
        setErrore(
          err.response?.data?.message || err.message || 'Impossibile caricare lo storico.'
        );
        setSessioni([]);
      } finally {
        setLoading(false);
      }
    }
    carica();
  }, [utente?.id_utente]);

  const totaleKwh = sessioni.reduce((s, r) => s + Number(r.quantita_kwh ?? 0), 0);
  const totaleEuro = sessioni.reduce((s, r) => s + Number(r.costo_totale ?? 0), 0);

  return (
    <div>
      <h1 className="page-title">Storico sessioni</h1>
      <p className="page-subtitle">
        Tutte le tue ricariche da <strong>sessioni_ricarica</strong> · {utente?.nome}{' '}
        {utente?.cognome}
      </p>

      {loading && <p>Caricamento...</p>}
      {errore && <p className="mappa-errore">{errore}</p>}

      {!loading && !errore && sessioni.length === 0 && (
        <p>Nessuna ricarica registrata. Avvia una sessione dalla Mappa.</p>
      )}

      {!loading && sessioni.length > 0 && (
        <>
          <p className="page-subtitle">
            {sessioni.length} sessioni · {totaleKwh.toFixed(2)} kWh totali · €{' '}
            {totaleEuro.toFixed(2)}
          </p>
          <div className="card card--storico-scroll">
            <table className="data-table data-table--storico">
              <thead>
                <tr>
                  <th>Stato</th>
                  <th>Inizio</th>
                  <th>Fine</th>
                  <th>Stazione</th>
                  <th>Colonnina</th>
                  <th>Veicolo</th>
                  <th>kWh</th>
                  <th>Durata</th>
                  <th>€</th>
                  <th>Pagamento</th>
                </tr>
              </thead>
              <tbody>
                {sessioni.map((s) => (
                  <tr key={s.id_sessione}>
                    <td>
                      <span className={`stato-badge stato-badge--${s.stato_ricarica}`}>
                        {etichettaStatoRicarica(s.stato_ricarica)}
                      </span>
                    </td>
                    <td>
                      {s.data_inizio
                        ? new Date(s.data_inizio).toLocaleString('it-IT')
                        : '—'}
                    </td>
                    <td>
                      {s.data_fine
                        ? new Date(s.data_fine).toLocaleString('it-IT')
                        : '—'}
                    </td>
                    <td>{s.nome_stazione}</td>
                    <td>
                      <strong>{s.identificativo_colonnina}</strong>
                      <br />
                      <small>
                        {s.tipo_connettore} · {s.potenza_max_kw} kW
                      </small>
                    </td>
                    <td>{s.tipo_veicolo}</td>
                    <td>{Number(s.quantita_kwh ?? 0).toFixed(3)}</td>
                    <td>
                      {s.durata_minuti != null && s.durata_minuti > 0
                        ? `${s.durata_minuti} min`
                        : s.durata_secondi != null
                          ? `${s.durata_secondi} s`
                          : '—'}
                    </td>
                    <td>€ {Number(s.costo_totale ?? 0).toFixed(2)}</td>
                    <td>{s.stato_pagamento}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Scuola() {
  const { utente } = useAuth();
  const [dati, setDati] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    async function carica() {
      setLoading(true);
      setErrore(null);
      try {
        const response = await axios.get(`${API_URL}/scuola/consumi`);
        if (response.status >= 400 || response.data?.status !== 'success') {
          throw new Error(response.data?.message || 'Errore nel caricamento dati scuola');
        }
        setDati(response.data.data);
      } catch (err) {
        console.error('Errore caricamento scuola:', err);
        setErrore(err.message || 'Impossibile caricare i dati della scuola');
      } finally {
        setLoading(false);
      }
    }
    carica();
  }, []);

  return (
    <div className="dashboard-scuola">
      <h1 className="page-title">Scuola & Green School</h1>
      <p className="page-subtitle">
        Visualizza i consumi energetici della scuola
      </p>

      {loading && <p className="loading">Caricamento dati...</p>}
      {errore && <p className="mappa-errore">{errore}</p>}

      {!loading && dati && (
        <>
          {/* Sezione Informazioni Scuola */}
          <div className="card card--scuola-info">
            <h2 className="section-title">Istituto Tecnico Barsan Galilei</h2>
            <p className="scuola-descrizione">
              Partecipazione attiva al progetto Green School con focus sulla sostenibilità energetica
              e sulla mobilità elettrica.
            </p>
            <a 
              href="https://www.barsantigalilei.edu.it/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-secondary btn-secondary--inline"
            >
              Visita sito della scuola →
            </a>
          </div>

          {/* Sezione Consumi Energetici */}
          <div className="card card--consumi">
            <h2 className="section-title">Consumi Energetici</h2>
            
            {dati.consumi && dati.consumi.length > 0 ? (
              <>
                <div className="consumi-summary">
                  <div className="consumi-stat">
                    <span className="consumi-label">Totale Energia</span>
                    <span className="consumi-valore">
                      {Number(dati.totale_kwh ?? 0).toFixed(2)} kWh
                    </span>
                  </div>
                  <div className="consumi-stat">
                    <span className="consumi-label">Ricariche Effettuate</span>
                    <span className="consumi-valore">{dati.numero_ricariche ?? 0}</span>
                  </div>
                  <div className="consumi-stat">
                    <span className="consumi-label">Veicoli Ricaricati</span>
                    <span className="consumi-valore">{dati.numero_veicoli ?? 0}</span>
                  </div>
                </div>

                <div className="consumi-grafico-container">
                  <h3 className="subsection-title">Consumo negli ultimi 30 giorni</h3>
                  <table className="data-table data-table--consumi">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Energia (kWh)</th>
                        <th>Ricariche</th>
                        <th>Utenti</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dati.consumi.map((c, idx) => (
                        <tr key={idx}>
                          <td>
                            {c.data 
                              ? new Date(c.data).toLocaleDateString('it-IT')
                              : `Giorno ${idx + 1}`}
                          </td>
                          <td>
                            <strong>{Number(c.kwh_totali ?? 0).toFixed(2)}</strong>
                          </td>
                          <td>{c.numero_ricariche ?? 0}</td>
                          <td>{c.numero_utenti ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="empty-state">
                Nessun dato disponibile. Inizia a ricaricare sulla mappa per registrare i consumi!
              </p>
            )}
          </div>

          {/* Sezione Statistiche */}
          <div className="card card--statistiche">
            <h2 className="section-title">Statistiche Green</h2>
            <div className="stats-grid">
              <div className="stat-box">
                <p className="stat-label">CO₂ Evitata (stima)</p>
                <p className="stat-value">
                  {((dati.totale_kwh ?? 0) * 0.1).toFixed(2)} kg
                </p>
                <p className="stat-note">equivalente a 100g per kWh</p>
              </div>
              <div className="stat-box">
                <p className="stat-label">Energia Media per Ricarica</p>
                <p className="stat-value">
                  {dati.numero_ricariche > 0 
                    ? ((dati.totale_kwh ?? 0) / (dati.numero_ricariche ?? 1)).toFixed(2)
                    : '—'} kWh
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="card card--cta-scuola">
            <p className="page-subtitle" style={{ marginTop: 0 }}>
              Ogni ricarica conta! Vai alla mappa per continuare a generare dati sostenibili per la scuola.
            </p>
            <Link to="/mappa" className="btn-primary">
              Vai alla Mappa →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function Admin() {
  const { utente } = useAuth();
  const [tab, setTab] = useState('stazioni');
  const [stazioni, setStazioni] = useState([]);
  const [colonnine, setColonnine] = useState([]);
  const [stazioneSel, setStazioneSel] = useState('');
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState(null);
  const [messaggio, setMessaggio] = useState(null);

  const oggiIso = () => new Date().toISOString().slice(0, 10);
  const [reportData, setReportData] = useState(oggiIso);
  const [reportStazione, setReportStazione] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportPayload, setReportPayload] = useState(null);

  const [formStazione, setFormStazione] = useState({
    id_stazione: '',
    nome: '',
    indirizzo: '',
    latitudine: '45.68',
    longitudine: '11.94',
    tipo_area: 'pubblico',
  });

  const [formColonnina, setFormColonnina] = useState({
    id_punto: '',
    identificativo: '',
    tipo_veicolo: 'auto',
    tipo_connettore: 'CCS2',
    potenza_max_kw: '22',
    tariffa_kwh: '0.5',
    stato_hardware: 'online',
  });

  const adminParams = { id_utente_admin: utente?.id_utente };

  async function caricaStazioni() {
    setLoading(true);
    setErrore(null);
    try {
      const res = await axios.get(`${API_URL}/admin/stazioni`, { params: adminParams });
      if (res.data?.status !== 'success') throw new Error(res.data?.message);
      setStazioni(res.data.data ?? []);
    } catch (err) {
      setErrore(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }

  async function caricaColonnine(idStazione) {
    if (!idStazione) {
      setColonnine([]);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/admin/colonnine`, {
        params: { ...adminParams, id_stazione: idStazione },
      });
      if (res.data?.status !== 'success') throw new Error(res.data?.message);
      setColonnine(res.data.data ?? []);
    } catch (err) {
      setErrore(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    caricaStazioni();
  }, []);

  useEffect(() => {
    if (stazioneSel) caricaColonnine(stazioneSel);
  }, [stazioneSel]);

  async function caricaReport() {
    setReportLoading(true);
    setErrore(null);
    try {
      const params = {
        ...adminParams,
        data: reportData,
      };
      if (reportStazione) params.id_stazione = reportStazione;

      const res = await axios.get(`${API_URL}/admin/report-giornaliero`, { params });
      if (res.data?.status !== 'success') throw new Error(res.data?.message);
      setReportPayload(res.data);
    } catch (err) {
      setReportPayload(null);
      const msg = err.response?.data?.message || err.message;
      setErrore(
        msg?.includes('JSON') || msg?.includes('vuota')
          ? 'Report non disponibile: esegui API/sync-xampp.ps1 e riavvia Apache.'
          : msg
      );
    } finally {
      setReportLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'report') caricaReport();
  }, [tab, reportData, reportStazione]);

  async function salvaStazione(e) {
    e.preventDefault();
    setErrore(null);
    setMessaggio(null);
    try {
      const res = await axios.post(`${API_URL}/admin/stazioni`, {
        ...adminParams,
        ...formStazione,
        latitudine: parseFloat(formStazione.latitudine),
        longitudine: parseFloat(formStazione.longitudine),
      });
      if (res.data?.status !== 'success') throw new Error(res.data?.message);
      setMessaggio(res.data.message);
      setFormStazione({
        id_stazione: '',
        nome: '',
        indirizzo: '',
        latitudine: '45.68',
        longitudine: '11.94',
        tipo_area: 'pubblico',
      });
      await caricaStazioni();
    } catch (err) {
      setErrore(err.response?.data?.message || err.message);
    }
  }

  async function eliminaStazione(id) {
    if (!window.confirm('Eliminare la stazione e tutte le colonnine collegate?')) return;
    try {
      const res = await axios.post(`${API_URL}/admin/stazioni`, {
        ...adminParams,
        azione: 'elimina',
        id_stazione: id,
      });
      if (res.data?.status !== 'success') throw new Error(res.data?.message);
      setMessaggio('Stazione eliminata');
      if (stazioneSel === id) setStazioneSel('');
      await caricaStazioni();
    } catch (err) {
      setErrore(err.response?.data?.message || err.message);
    }
  }

  async function salvaColonnina(e) {
    e.preventDefault();
    if (!stazioneSel) {
      setErrore('Seleziona una stazione');
      return;
    }
    setErrore(null);
    try {
      const res = await axios.post(`${API_URL}/admin/colonnine`, {
        ...adminParams,
        id_stazione: stazioneSel,
        ...formColonnina,
        potenza_max_kw: parseFloat(formColonnina.potenza_max_kw),
        tariffa_kwh: parseFloat(formColonnina.tariffa_kwh),
      });
      if (res.data?.status !== 'success') throw new Error(res.data?.message);
      setMessaggio(res.data.message);
      setFormColonnina({
        id_punto: '',
        identificativo: '',
        tipo_veicolo: 'auto',
        tipo_connettore: 'CCS2',
        potenza_max_kw: '22',
        tariffa_kwh: '0.5',
        stato_hardware: 'online',
      });
      await caricaColonnine(stazioneSel);
    } catch (err) {
      setErrore(err.response?.data?.message || err.message);
    }
  }

  async function eliminaColonnina(id) {
    if (!window.confirm('Eliminare questa colonnina?')) return;
    try {
      const res = await axios.post(`${API_URL}/admin/colonnine`, {
        ...adminParams,
        azione: 'elimina',
        id_punto: id,
      });
      if (res.data?.status !== 'success') throw new Error(res.data?.message);
      setMessaggio('Colonnina eliminata');
      await caricaColonnine(stazioneSel);
    } catch (err) {
      setErrore(err.response?.data?.message || err.message);
    }
  }

  async function mettiOnlineTutte() {
    if (!stazioneSel) return;
    try {
      const res = await axios.post(`${API_URL}/admin/colonnine`, {
        ...adminParams,
        azione: 'online_tutte',
        id_stazione: stazioneSel,
      });
      if (res.data?.status !== 'success') throw new Error(res.data?.message);
      setMessaggio(res.data.message);
      await caricaColonnine(stazioneSel);
    } catch (err) {
      setErrore(err.response?.data?.message || err.message);
    }
  }

  function modificaStazione(s) {
    setFormStazione({
      id_stazione: s.id_stazione,
      nome: s.nome,
      indirizzo: s.indirizzo || '',
      latitudine: String(s.latitudine),
      longitudine: String(s.longitudine),
      tipo_area: s.tipo_area || 'pubblico',
    });
    setStazioneSel(s.id_stazione);
    setTab('stazioni');
  }

  function modificaColonnina(c) {
    setFormColonnina({
      id_punto: c.id_punto,
      identificativo: c.identificativo,
      tipo_veicolo: c.tipo_veicolo,
      tipo_connettore: c.tipo_connettore || 'CCS2',
      potenza_max_kw: String(c.potenza_max_kw),
      tariffa_kwh: String(c.tariffa_kwh),
      stato_hardware: c.stato_hardware,
    });
  }

  return (
    <div>
      <h1 className="page-title">Pannello Admin</h1>
      <p className="page-subtitle">Gestione stazioni e colonnine · {utente?.email}</p>

      <div className="admin-tabs">
        <button
          type="button"
          className={tab === 'stazioni' ? 'auth-tab auth-tab--active' : 'auth-tab'}
          onClick={() => setTab('stazioni')}
        >
          Stazioni
        </button>
        <button
          type="button"
          className={tab === 'colonnine' ? 'auth-tab auth-tab--active' : 'auth-tab'}
          onClick={() => setTab('colonnine')}
        >
          Colonnine
        </button>
        <button
          type="button"
          className={tab === 'report' ? 'auth-tab auth-tab--active' : 'auth-tab'}
          onClick={() => setTab('report')}
        >
          Report giornaliero
        </button>
      </div>

      {errore && <p className="mappa-errore">{errore}</p>}
      {messaggio && <p className="sessione-msg">{messaggio}</p>}
      {loading && <p>Caricamento...</p>}

      {tab === 'stazioni' && (
        <div className="admin-grid">
          <div className="card">
            <h2 className="section-title">{formStazione.id_stazione ? 'Modifica' : 'Nuova'} stazione</h2>
            <form className="auth-form" onSubmit={salvaStazione}>
              <label>
                Nome
                <input
                  required
                  value={formStazione.nome}
                  onChange={(e) => setFormStazione({ ...formStazione, nome: e.target.value })}
                />
              </label>
              <label>
                Indirizzo
                <input
                  value={formStazione.indirizzo}
                  onChange={(e) => setFormStazione({ ...formStazione, indirizzo: e.target.value })}
                />
              </label>
              <label>
                Latitudine
                <input
                  required
                  value={formStazione.latitudine}
                  onChange={(e) => setFormStazione({ ...formStazione, latitudine: e.target.value })}
                />
              </label>
              <label>
                Longitudine
                <input
                  required
                  value={formStazione.longitudine}
                  onChange={(e) => setFormStazione({ ...formStazione, longitudine: e.target.value })}
                />
              </label>
              <button type="submit" className="btn-primary">Salva stazione</button>
            </form>
          </div>
          <div className="card">
            <h2 className="section-title">Elenco stazioni</h2>
            <ul className="admin-list">
              {stazioni.map((s) => (
                <li key={s.id_stazione} className="admin-list__item">
                  <div>
                    <strong>{s.nome}</strong>
                    <br />
                    <small>
                      {s.num_colonnine} colonnine · {s.colonnine_occupate} occupate
                    </small>
                  </div>
                  <div className="admin-list__actions">
                    <button type="button" className="btn-secondary" onClick={() => modificaStazione(s)}>
                      Modifica
                    </button>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => eliminaStazione(s.id_stazione)}
                    >
                      Elimina
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === 'colonnine' && (
        <div className="admin-grid">
          <div className="card">
            <h2 className="section-title">Stazione</h2>
            <select
              className="admin-select"
              value={stazioneSel}
              onChange={(e) => setStazioneSel(e.target.value)}
            >
              <option value="">— Seleziona —</option>
              {stazioni.map((s) => (
                <option key={s.id_stazione} value={s.id_stazione}>
                  {s.nome}
                </option>
              ))}
            </select>
            {stazioneSel && (
              <button type="button" className="btn-secondary admin-mt" onClick={mettiOnlineTutte}>
                Imposta tutte online (attivo)
              </button>
            )}
            <h2 className="section-title admin-mt">
              {formColonnina.id_punto ? 'Modifica' : 'Nuova'} colonnina
            </h2>
            <form className="auth-form" onSubmit={salvaColonnina}>
              <label>
                Identificativo
                <input
                  required
                  value={formColonnina.identificativo}
                  onChange={(e) =>
                    setFormColonnina({ ...formColonnina, identificativo: e.target.value })
                  }
                />
              </label>
              <label>
                Tipo veicolo
                <select
                  value={formColonnina.tipo_veicolo}
                  onChange={(e) =>
                    setFormColonnina({ ...formColonnina, tipo_veicolo: e.target.value })
                  }
                >
                  <option value="auto">auto</option>
                  <option value="bici">bici</option>
                  <option value="monopattino">monopattino</option>
                </select>
              </label>
              <label>
                Stato hardware
                <select
                  value={formColonnina.stato_hardware}
                  onChange={(e) =>
                    setFormColonnina({ ...formColonnina, stato_hardware: e.target.value })
                  }
                >
                  <option value="online">online (attivo)</option>
                  <option value="offline">offline</option>
                  <option value="guasto">guasto</option>
                  <option value="manutenzione_programmata">manutenzione</option>
                </select>
              </label>
              <button type="submit" className="btn-primary" disabled={!stazioneSel}>
                Salva colonnina
              </button>
            </form>
          </div>
          <div className="card">
            <h2 className="section-title">Colonnine della stazione</h2>
            {!stazioneSel && <p>Seleziona una stazione.</p>}
            <ul className="admin-list">
              {colonnine.map((c) => (
                <li key={c.id_punto} className="admin-list__item">
                  <div>
                    <strong>{c.identificativo}</strong>
                    <span className={`stato-badge stato-badge--${c.stato}`}> {c.stato}</span>
                    <br />
                    <small>
                      {c.tipo_veicolo} · {c.stato_hardware}
                      {c.sessione_aperta ? ' · sessione attiva' : ''}
                    </small>
                  </div>
                  <div className="admin-list__actions">
                    <button type="button" className="btn-secondary" onClick={() => modificaColonnina(c)}>
                      Modifica
                    </button>
                    <button
                      type="button"
                      className="btn-danger"
                      disabled={c.sessione_aperta}
                      onClick={() => eliminaColonnina(c.id_punto)}
                    >
                      Elimina
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === 'report' && (
        <div className="admin-report">
          <div className="card admin-report__filtri">
            <h2 className="section-title">Filtri report</h2>
            <div className="admin-report__filtri-row">
              <label>
                Data
                <input
                  type="date"
                  className="admin-select"
                  value={reportData}
                  onChange={(e) => setReportData(e.target.value)}
                />
              </label>
              <label>
                Stazione
                <select
                  className="admin-select"
                  value={reportStazione}
                  onChange={(e) => setReportStazione(e.target.value)}
                >
                  <option value="">Tutte le stazioni</option>
                  {stazioni.map((s) => (
                    <option key={s.id_stazione} value={s.id_stazione}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn-secondary"
                onClick={caricaReport}
                disabled={reportLoading}
              >
                Aggiorna
              </button>
            </div>
          </div>

          {reportLoading && <p>Caricamento report...</p>}

          {!reportLoading && reportPayload && (
            <>
              <p className="page-subtitle">
                Report del {formattaData(reportPayload.data)} ·{' '}
                {reportPayload.totali_per_stazione?.length ?? 0} stazioni con attività
              </p>

              {(reportPayload.totali_per_stazione ?? []).map((tot) => {
                const dettaglio = (reportPayload.righe ?? []).filter(
                  (r) => r.id_stazione === tot.id_stazione
                );
                return (
                  <div key={tot.id_stazione} className="card admin-report__stazione">
                    <h2 className="section-title">{tot.nome_stazione}</h2>
                    <div className="admin-report__totali">
                      <span>
                        <strong>{tot.numero_ricariche}</strong> ricariche
                      </span>
                      <span>
                        <strong>{tot.totale_kwh}</strong> kWh
                      </span>
                      <span>
                        <strong>€ {Number(tot.incasso_standard).toFixed(2)}</strong> incasso
                      </span>
                      <span>
                        <strong>{tot.kwh_gratuiti}</strong> kWh gratuiti
                      </span>
                    </div>
                    {dettaglio.length > 0 ? (
                      <div className="table-wrap admin-mt">
                        <table className="data-table data-table--storico">
                          <thead>
                            <tr>
                              <th>Tipo veicolo</th>
                              <th>Ricariche</th>
                              <th>kWh</th>
                              <th>Incasso</th>
                              <th>kWh gratuiti</th>
                              <th>Durata media</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dettaglio.map((r) => (
                              <tr
                                key={`${r.id_stazione}-${r.tipo_veicolo}`}
                              >
                                <td>{r.tipo_veicolo}</td>
                                <td>{r.numero_ricariche}</td>
                                <td>{r.totale_kwh}</td>
                                <td>€ {Number(r.incasso_standard).toFixed(2)}</td>
                                <td>{r.kwh_gratuiti}</td>
                                <td>{r.durata_media_minuti} min</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="page-subtitle">Nessun dettaglio per tipo veicolo.</p>
                    )}
                  </div>
                );
              })}

              {(reportPayload.stazioni_senza_attivita ?? []).length > 0 && (
                <div className="card admin-report__vuote">
                  <h2 className="section-title">Stazioni senza ricariche nel giorno</h2>
                  <ul className="admin-list">
                    {reportPayload.stazioni_senza_attivita.map((s) => (
                      <li key={s.id_stazione} className="admin-list__item">
                        <span>{s.nome_stazione}</span>
                        <span className="stato-badge stato-badge--default">0 sessioni</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(reportPayload.totali_per_stazione ?? []).length === 0 &&
                (reportPayload.stazioni_senza_attivita ?? []).length === 0 && (
                  <div className="card">
                    <p>Nessun dato per la data selezionata.</p>
                  </div>
                )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Mappa() {
  const { utente, isAdmin } = useAuth();
  const {
    sessioniAttive,
    registraSessioneAvviata,
    haSessioniAttive,
    erroreSessione,
    setErroreSessione,
  } = useSession();
  const accumulatoriStepRef = useRef(null);
  const [stazioni, setStazioni] = useState([]);
  const [accumulatori, setAccumulatori] = useState([]);
  const [stazioneSelezionataId, setStazioneSelezionataId] = useState(null);
  const [accumulatoreSelezionatoId, setAccumulatoreSelezionatoId] = useState(null);
  const [colonnine, setColonnine] = useState(null);
  const [colonnineLoading, setColonnineLoading] = useState(false);
  const [colonninaSelezionataId, setColonninaSelezionataId] = useState(null);
  const [avvioInCorso, setAvvioInCorso] = useState(false);
  const [messaggioSessione, setMessaggioSessione] = useState(null);
  const [erroreAzione, setErroreAzione] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState(null);
  const [avvisoSimulatore, setAvvisoSimulatore] = useState(null);

  const stazioneSelezionata =
    stazioni.find((s) => String(s.id) === String(stazioneSelezionataId ?? '')) ??
    null;

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

  useEffect(() => {
    let attivo = true;
    axios
      .get(`${API_URL}/simulatore/health`)
      .then((res) => {
        if (!attivo || res.data?.status === 'success') return;
        setAvvisoSimulatore(
          res.data?.message ||
            'Simulatore Python non attivo. Avvia python simulatore/main.py (porta 5050).'
        );
      })
      .catch(() => {
        if (attivo) {
          setAvvisoSimulatore(
            'Impossibile verificare il simulatore. Controlla che Node (3001), Apache e python main.py (5050) siano avviati.'
          );
        }
      });
    return () => {
      attivo = false;
    };
  }, []);

  function selezionaStazione(id) {
    const nuova = String(id);
    const giaSelezionata = nuova === String(stazioneSelezionataId ?? '');

    if (!giaSelezionata) {
      setStazioneSelezionataId(nuova);
      setAccumulatoreSelezionatoId(null);
      setColonninaSelezionataId(null);
      setColonnine(null);
      setErroreAzione(null);
      setMessaggioSessione(null);
    }

    window.requestAnimationFrame(() => {
      accumulatoriStepRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
  }

  useEffect(() => {
    if (!stazioneSelezionataId) return undefined;
    const t = window.setTimeout(() => {
      accumulatoriStepRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }, 120);
    return () => window.clearTimeout(t);
  }, [stazioneSelezionataId]);

  function selezionaAccumulatore(id) {
    const idAcc = String(id);
    setAccumulatoreSelezionatoId(idAcc);
    setColonninaSelezionataId(null);
    setColonnine(null);
    if (stazioneSelezionataId) {
      caricaColonnine(stazioneSelezionataId, idAcc);
    }
  }

  function messaggioErroreApi(err, fallback) {
    const data = err.response?.data;
    if (typeof data === 'string' && data.trim().startsWith('<')) {
      return 'API PHP non configurata. Esegui API/sync-xampp.ps1 e riavvia il server Node.';
    }
    return data?.message || err.message || fallback;
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
    setErroreSessione(null);
    try {
      const res = await axios.post(`${API_URL}/sessione/avvia`, {
        id_punto: colonninaSelezionataId,
        id_utente: utente.id_utente,
        id_accumulatore: accumulatoreSelezionatoId,
        metodo_avvio: 'APP',
      });
      if (res.status >= 400 || res.data?.status !== 'success') {
        throw new Error(res.data?.message || 'Avvio sessione fallito');
      }
      const d = res.data.data;
      registraSessioneAvviata(d, {
        id_accumulatore: accumulatoreSelezionatoId,
        nome_stazione: stazioneSelezionata?.nome ?? null,
      });
      setColonninaSelezionataId(null);
      setMessaggioSessione(
        'Ricarica avviata. Puoi continuare sulla mappa o gestirla dalla Dashboard.'
      );
      if (d.accumulatore) {
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
      setErroreAzione(messaggioErroreApi(err, 'Impossibile avviare la sessione'));
    } finally {
      setAvvioInCorso(false);
    }
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

  const totaleAccumulatori = stazioni.reduce(
    (sum, s) => sum + s.numAccumulatori,
    0
  );

  const mostraAccumulatori = Boolean(stazioneSelezionata);
  const mostraColonnine = Boolean(accumulatoreSelezionatoId);

  const centerLat = stazioneSelezionata
    ? stazioneSelezionata.lat
    : stazioni.reduce((sum, s) => sum + s.lat, 0) / stazioni.length;
  const centerLng = stazioneSelezionata
    ? stazioneSelezionata.lng
    : stazioni.reduce((sum, s) => sum + s.lng, 0) / stazioni.length;
  const mapZoom = stazioneSelezionata ? 15 : 14;

  return (
    <div className="mappa-flow">
      <h1 className="page-title">Mappa stazioni</h1>
      <p className="page-subtitle">
        {stazioni.length} stazioni · {totaleAccumulatori} accumulatori
      </p>

      {avvisoSimulatore && (
        <p className="mappa-errore mappa-errore--simulatore">{avvisoSimulatore}</p>
      )}

      {erroreAzione && <p className="mappa-errore">{erroreAzione}</p>}
      {erroreSessione && !isAdmin && (
        <p className="mappa-errore">{erroreSessione}</p>
      )}

      {haSessioniAttive && !isAdmin && (
        <div className="card mappa-banner-sessioni">
          <p>
            <strong>{sessioniAttive.length}</strong>{' '}
            {sessioniAttive.length === 1 ? 'ricarica in corso' : 'ricariche in corso'}.
            Monitora energia e durata dalla{' '}
            <Link to="/">Dashboard</Link>.
          </p>
        </div>
      )}

      {messaggioSessione && (
        <p className="sessione-msg mappa-msg-avvio">{messaggioSessione}</p>
      )}

      <>
          <TabellaStazioni
            stazioni={stazioni}
            stazioneSelezionataId={stazioneSelezionataId}
            onSeleziona={selezionaStazione}
            disabilitata={false}
          />

          <div
            className={
              stazioneSelezionata
                ? 'map-container map-container--compact'
                : 'map-container'
            }
          >
            <MapContainer
              center={[centerLat, centerLng]}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {stazioneSelezionata && (
                <CentraMappaSuStazione
                  lat={stazioneSelezionata.lat}
                  lng={stazioneSelezionata.lng}
                  zoom={mapZoom}
                />
              )}
              {stazioni.map((s) => (
                <Marker
                  key={s.id}
                  position={[s.lat, s.lng]}
                  eventHandlers={{
                    click: () => selezionaStazione(s.id),
                  }}
                >
                  <Popup>
                    <strong>{s.nome}</strong>
                    <br />
                    {s.indirizzo}
                    <br />
                    <button
                      type="button"
                      className="btn-dettaglio-popup"
                      onClick={() => selezionaStazione(s.id)}
                    >
                      Seleziona stazione
                    </button>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          <div
            ref={accumulatoriStepRef}
            className={
              mostraAccumulatori
                ? 'mappa-step mappa-step--attivo'
                : 'mappa-step mappa-step--inattivo'
            }
          >
            {mostraAccumulatori ? (
              <ListaAccumulatori
                stazione={stazioneSelezionata}
                accumulatori={accumulatori}
                accumulatoreSelezionatoId={accumulatoreSelezionatoId}
                onSeleziona={selezionaAccumulatore}
                compatto={mostraColonnine}
              />
            ) : (
              <div className="card mappa-step__placeholder">
                <p className="page-subtitle" style={{ margin: 0 }}>
                  Seleziona una stazione sopra per vedere gli accumulatori disponibili.
                </p>
              </div>
            )}
          </div>

          {mostraColonnine && (
            <PannelloColonnine
              colonnine={colonnine}
              colonnineLoading={colonnineLoading}
              colonninaSelezionataId={colonninaSelezionataId}
              onSelezionaColonnina={selezionaColonnina}
              onAvviaSessione={avviaSessione}
              avvioInCorso={avvioInCorso}
              soloLettura={isAdmin}
            />
          )}
      </>
    </div>
  );
}

function AppShell() {
  const { utente, caricamento } = useAuth();

  if (caricamento) {
    return (
      <div className="auth-page">
        <p>Caricamento...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          utente ? (
            <Navigate to={utente.is_admin ? '/admin' : '/mappa'} replace />
          ) : (
            <PaginaAuth />
          )
        }
      />
      <Route
        path="/*"
        element={
          utente ? (
            <SessionProvider>
              <div className="app-shell">
                <SessionModals />
                <Navbar />
                <main className="app-main">
                  <Routes>
                  <Route
                    path="/"
                    element={
                      <SoloUtente>
                        <Dashboard />
                      </SoloUtente>
                    }
                  />
                  <Route path="/mappa" element={<Mappa />} />
                  <Route
                    path="/storico"
                    element={
                      <SoloUtente>
                        <Storico />
                      </SoloUtente>
                    }
                  />
                  <Route
                    path="/scuola"
                    element={
                      <SoloUtente>
                        <Scuola />
                      </SoloUtente>
                    }
                  />
                  <Route
                    path="/game"
                    element={
                      <SoloUtente>
                        <Classifica />
                      </SoloUtente>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <RequireAdmin>
                        <Admin />
                      </RequireAdmin>
                    }
                  />
                  <Route path="*" element={<Navigate to="/mappa" replace />} />
                  </Routes>
                </main>
              </div>
            </SessionProvider>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}


export default App;