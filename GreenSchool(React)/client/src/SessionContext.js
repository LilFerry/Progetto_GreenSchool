import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const API_URL = 'http://localhost:3001/api';

const SessionContext = createContext(null);

function messaggioErroreApi(err, fallback) {
  const data = err.response?.data;
  if (typeof data === 'string' && data.trim().startsWith('<')) {
    return 'API PHP non configurata. Esegui API/sync-xampp.ps1 e riavvia il server Node.';
  }
  return data?.message || err.message || fallback;
}

export function calcolaDurataSessione(sessione, live) {
  if (sessione?.durata_secondi != null) {
    const sec = sessione.durata_secondi;
    return {
      durata_secondi: sec,
      durata_minuti: sessione.durata_minuti ?? Math.floor(sec / 60),
    };
  }
  if (live?.durata_secondi != null) {
    const sec = live.durata_secondi;
    return { durata_secondi: sec, durata_minuti: Math.floor(sec / 60) };
  }
  if (sessione?.data_inizio && sessione?.data_fine) {
    const sec = Math.max(
      0,
      Math.floor((new Date(sessione.data_fine) - new Date(sessione.data_inizio)) / 1000)
    );
    return { durata_secondi: sec, durata_minuti: Math.floor(sec / 60) };
  }
  return {};
}

function normalizzaSessioneAttiva(row) {
  return {
    id_sessione: row.id_sessione,
    id_punto: row.id_punto,
    identificativo: row.identificativo_colonnina ?? row.identificativo,
    id_accumulatore: row.id_accumulatore ?? null,
    nome_stazione: row.nome_stazione ?? null,
    data_inizio: row.data_inizio ?? null,
    quantita_kwh: row.quantita_kwh ?? null,
    avviataIl: row.data_inizio ? null : Date.now(),
  };
}

export function SessionProvider({ children }) {
  const { utente, isAdmin } = useAuth();
  const [sessioniAttive, setSessioniAttive] = useState([]);
  const [statoLiveMap, setStatoLiveMap] = useState({});
  const [terminaInCorsoId, setTerminaInCorsoId] = useState(null);
  const [riepilogoSessione, setRiepilogoSessione] = useState(null);
  const [stazioneRiepilogo, setStazioneRiepilogo] = useState(null);
  const [xpReward, setXpReward] = useState(null);
  const [erroreSessione, setErroreSessione] = useState(null);

  const idUtente = utente?.id_utente;
  const sessioneIdsKey = sessioniAttive.map((s) => s.id_sessione).join(',');
  const sessioniRef = useRef(sessioniAttive);
  sessioniRef.current = sessioniAttive;

  const sincronizzaAttive = useCallback(async () => {
    if (!idUtente || isAdmin) {
      setSessioniAttive([]);
      setStatoLiveMap({});
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/sessioni`, {
        params: { id_utente: idUtente, limite: 50 },
      });
      if (res.data?.status !== 'success') return;
      const list = Array.isArray(res.data.data) ? res.data.data : [];
      const attive = list
        .filter((s) => s.stato_ricarica === 'in_corso')
        .map(normalizzaSessioneAttiva);
      setSessioniAttive(attive);
    } catch (err) {
      console.warn('sync sessioni attive:', err.message);
    }
  }, [idUtente, isAdmin]);

  useEffect(() => {
    sincronizzaAttive();
  }, [sincronizzaAttive]);

  const applicaRiepilogo = useCallback((sess, live, identificativoFallback, nomeStazione) => {
    const durata = calcolaDurataSessione(sess, live);
    setRiepilogoSessione({
      id_punto: sess?.id_punto,
      identificativo: sess?.identificativo_colonnina ?? identificativoFallback,
      quantita_kwh: sess?.quantita_kwh ?? live?.kwh_erogati ?? 0,
      costo_totale: sess?.costo_totale ?? 0,
      ...durata,
    });
    if (nomeStazione) setStazioneRiepilogo(nomeStazione);
  }, []);

  const applicaGamification = useCallback(
    (gamification) => {
      if (isAdmin || !gamification || gamification.errore) return;
      if ((gamification.xp_guadagnati ?? 0) > 0) {
        setXpReward(gamification);
      }
    },
    [isAdmin]
  );

  const rimuoviSessione = useCallback((idSessione) => {
    setSessioniAttive((prev) => prev.filter((s) => String(s.id_sessione) !== String(idSessione)));
    setStatoLiveMap((prev) => {
      const next = { ...prev };
      delete next[idSessione];
      return next;
    });
  }, []);

  const registraSessioneAvviata = useCallback((d, meta = {}) => {
    const row = {
      id_sessione: d.id_sessione,
      id_punto: d.id_punto,
      identificativo_colonnina: d.identificativo,
      id_accumulatore: meta.id_accumulatore ?? null,
      nome_stazione: meta.nome_stazione ?? null,
      data_inizio: d.sessione?.data_inizio ?? null,
      quantita_kwh: null,
    };
    const nuova = normalizzaSessioneAttiva(row);
    if (!nuova.data_inizio) nuova.avviataIl = Date.now();

    setSessioniAttive((prev) => {
      if (prev.some((s) => String(s.id_sessione) === String(nuova.id_sessione))) {
        return prev;
      }
      return [...prev, nuova];
    });
    setErroreSessione(null);
  }, []);

  const terminaSessione = useCallback(
    async (idSessione, idAccumulatore = null) => {
      const sess = sessioniAttive.find((s) => String(s.id_sessione) === String(idSessione));
      if (!sess) return null;

      setTerminaInCorsoId(idSessione);
      setErroreSessione(null);
      try {
        const body = { id_sessione: idSessione };
        if (idAccumulatore || sess.id_accumulatore) {
          body.id_accumulatore = idAccumulatore ?? sess.id_accumulatore;
        }
        const res = await axios.post(`${API_URL}/sessione/termina`, body);
        if (res.status >= 400 || res.data?.status !== 'success') {
          throw new Error(res.data?.message || 'Chiusura sessione fallita');
        }
        const d = res.data.data;
        const live = statoLiveMap[idSessione];
        const durata = calcolaDurataSessione(d.sessione, d.simulatore?.sessione ?? live);
        rimuoviSessione(idSessione);
        applicaRiepilogo(
          { ...d.sessione, ...durata },
          d.simulatore?.sessione ?? live,
          sess.identificativo,
          sess.nome_stazione
        );
        applicaGamification(d.gamification);
        return d;
      } catch (err) {
        setErroreSessione(messaggioErroreApi(err, 'Impossibile terminare la sessione'));
        return null;
      } finally {
        setTerminaInCorsoId(null);
      }
    },
    [
      sessioniAttive,
      statoLiveMap,
      rimuoviSessione,
      applicaRiepilogo,
      applicaGamification,
    ]
  );

  useEffect(() => {
    if (!sessioneIdsKey) return undefined;

    let attivo = true;

    async function pollUna(sessione) {
      try {
        const res = await axios.get(`${API_URL}/sessione/stato`, {
          params: { id_sessione: sessione.id_sessione },
        });
        if (!attivo || res.data?.status !== 'success') return;

        const live = res.data.data?.live ?? null;
        const sess = res.data.data?.sessione;

        if (live) {
          setStatoLiveMap((prev) => ({ ...prev, [sessione.id_sessione]: live }));
        }

        if (sess) {
          setSessioniAttive((prev) =>
            prev.map((s) =>
              String(s.id_sessione) === String(sessione.id_sessione)
                ? {
                    ...s,
                    ...(sess.quantita_kwh != null ? { quantita_kwh: sess.quantita_kwh } : {}),
                    ...(sess.data_inizio ? { data_inizio: sess.data_inizio } : {}),
                  }
                : s
            )
          );
        }

        if (sess?.stato === 'terminata' || sess?.data_fine) {
          rimuoviSessione(sessione.id_sessione);
          applicaRiepilogo(sess, live, sessione.identificativo, sessione.nome_stazione);
          applicaGamification(res.data.data?.gamification);
        }
      } catch (err) {
        console.warn('poll sessione:', sessione.id_sessione, err.message);
      }
    }

    async function pollTutte() {
      await Promise.all(sessioniRef.current.map((s) => pollUna(s)));
    }

    pollTutte();
    const timer = setInterval(pollTutte, 5000);
    return () => {
      attivo = false;
      clearInterval(timer);
    };
  }, [sessioneIdsKey, rimuoviSessione, applicaRiepilogo, applicaGamification]);

  const chiudiRiepilogo = useCallback(() => {
    setRiepilogoSessione(null);
    setStazioneRiepilogo(null);
    setXpReward(null);
  }, []);

  const chiudiXpMostraRiepilogo = useCallback(() => {
    setXpReward(null);
  }, []);

  const value = useMemo(
    () => ({
      sessioniAttive,
      statoLiveMap,
      terminaInCorsoId,
      erroreSessione,
      setErroreSessione,
      registraSessioneAvviata,
      terminaSessione,
      sincronizzaAttive,
      riepilogoSessione,
      stazioneRiepilogo,
      xpReward,
      chiudiRiepilogo,
      chiudiXpMostraRiepilogo,
      haSessioniAttive: sessioniAttive.length > 0,
    }),
    [
      sessioniAttive,
      statoLiveMap,
      terminaInCorsoId,
      erroreSessione,
      registraSessioneAvviata,
      terminaSessione,
      sincronizzaAttive,
      riepilogoSessione,
      stazioneRiepilogo,
      xpReward,
      chiudiRiepilogo,
      chiudiXpMostraRiepilogo,
    ]
  );

  if (isAdmin || !idUtente) {
    return <>{children}</>;
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    return {
      sessioniAttive: [],
      statoLiveMap: {},
      terminaInCorsoId: null,
      erroreSessione: null,
      setErroreSessione: () => {},
      registraSessioneAvviata: () => {},
      terminaSessione: async () => null,
      sincronizzaAttive: async () => {},
      riepilogoSessione: null,
      stazioneRiepilogo: null,
      xpReward: null,
      chiudiRiepilogo: () => {},
      chiudiXpMostraRiepilogo: () => {},
      haSessioniAttive: false,
    };
  }
  return ctx;
}
