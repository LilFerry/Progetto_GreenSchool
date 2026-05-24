"""
Simulatore hardware di una colonnina di ricarica.
Aggiorna punti_ricarica, accumulatori_stazione e storico_livello_batteria.
"""

from __future__ import annotations

import threading
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Optional

from mysql.connector.cursor import MySQLCursorDict

from accumulatore_utils import stato_idle_da_percentuale
from config import STORICO_INTERVAL_SEC, TICK_INTERVAL_SEC
from database import fetch_one, get_connection


@dataclass
class StatoSessione:
    id_sessione: str
    id_punto: str
    id_stazione: str
    id_utente: Optional[str]
    id_accumulatore: str
    potenza_kw: float
    tariffa_kwh: float
    kwh_erogati: float = 0.0
    avviata_il: datetime = field(default_factory=datetime.now)
    ultimo_storico: float = field(default_factory=time.time)
    attiva: bool = True
    motivo_stop: Optional[str] = None


class ColonninaSimulator:
    """Simula una singola colonnina con un thread di ricarica dedicato."""

    def __init__(self, stato: StatoSessione, on_finale: Callable[[str, dict], None]):
        self.stato = stato
        self._on_finale = on_finale
        self._thread = threading.Thread(target=self._loop, daemon=True, name=f"sim-{stato.id_punto[:8]}")
        self._lock = threading.Lock()
        self._risultato_finale: Optional[dict] = None

    def avvia(self) -> None:
        self._thread.start()

    def ferma(self, motivo: str = "richiesta_utente") -> dict:
        with self._lock:
            if self._risultato_finale is not None:
                return self._risultato_finale
            if self.stato.attiva:
                self.stato.attiva = False
                self.stato.motivo_stop = motivo
        if self._thread.is_alive():
            self._thread.join(timeout=max(2.0, TICK_INTERVAL_SEC * 2))
        if self._risultato_finale is not None:
            return self._risultato_finale
        return self._finalizza()

    def snapshot(self) -> dict:
        s = self.stato
        durata_sec = (datetime.now() - s.avviata_il).total_seconds()
        return {
            "id_sessione": s.id_sessione,
            "id_punto": s.id_punto,
            "id_stazione": s.id_stazione,
            "id_utente": s.id_utente,
            "attiva": s.attiva,
            "kwh_erogati": round(s.kwh_erogati, 3),
            "potenza_kw": s.potenza_kw,
            "durata_secondi": int(durata_sec),
            "motivo_stop": s.motivo_stop,
        }

    def _loop(self) -> None:
        while True:
            with self._lock:
                if not self.stato.attiva:
                    break
            try:
                continua = self._tick()
                if not continua:
                    with self._lock:
                        self.stato.attiva = False
                        self.stato.motivo_stop = "accumulatore_esaurito"
                    break
            except Exception as exc:
                with self._lock:
                    self.stato.attiva = False
                    self.stato.motivo_stop = f"errore_simulazione: {exc}"
                break
            time.sleep(TICK_INTERVAL_SEC)

        risultato = self._finalizza()
        self._on_finale(self.stato.id_sessione, risultato)

    def _finalizza(self) -> dict:
        with self._lock:
            if self._risultato_finale is not None:
                return self._risultato_finale
            self._risultato_finale = self._chiudi_su_db()
            return self._risultato_finale

    def _tick(self) -> bool:
        """Eroga energia per un tick. Ritorna False se non c'è più energia."""
        delta_kwh = self.stato.potenza_kw * (TICK_INTERVAL_SEC / 3600.0)

        with get_connection() as conn:
            cur: MySQLCursorDict = conn.cursor(dictionary=True)
            acc = fetch_one(
                cur,
                """
                SELECT livello_corrente_kwh, capacita_utilizzabile_kwh,
                       potenza_max_scarica_kw, stato_operativo
                FROM accumulatori_stazione
                WHERE id_accumulatore = %s
                FOR UPDATE
                """,
                (self.stato.id_accumulatore,),
            )
            if not acc or float(acc["livello_corrente_kwh"]) <= 0:
                return False

            disponibile = float(acc["livello_corrente_kwh"])
            erogato = min(delta_kwh, disponibile)
            nuovo_livello = disponibile - erogato
            cap_util = float(acc["capacita_utilizzabile_kwh"])
            perc = min(100.0, (nuovo_livello / cap_util) * 100.0) if cap_util > 0 else 0.0

            cur.execute(
                """
                UPDATE accumulatori_stazione
                SET livello_corrente_kwh = %s,
                    percentuale_carica = %s,
                    stato_operativo = 'scarica',
                    data_ultimo_aggiornamento = NOW()
                WHERE id_accumulatore = %s
                """,
                (round(nuovo_livello, 2), round(perc, 2), self.stato.id_accumulatore),
            )
            cur.execute(
                """
                UPDATE punti_ricarica
                SET stato_hardware = 'online',
                    data_ultimo_heartbeat = NOW()
                WHERE id_punto = %s
                """,
                (self.stato.id_punto,),
            )
            conn.commit()

        self.stato.kwh_erogati += erogato

        with get_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                UPDATE sessioni_ricarica
                SET quantita_kwh = %s
                WHERE id_sessione = %s AND data_fine IS NULL
                """,
                (round(self.stato.kwh_erogati, 3), self.stato.id_sessione),
            )
        now = time.time()
        if now - self.stato.ultimo_storico >= STORICO_INTERVAL_SEC:
            self._registra_storico(nuovo_livello, self.stato.potenza_kw)
            self.stato.ultimo_storico = now

        return erogato >= delta_kwh * 0.01

    

    def _registra_storico(self, livello_kwh: float, potenza_kw: float) -> None:
        with get_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO storico_livello_batteria
                    (id_accumulatore, livello_kwh, potenza_istantanea_kw)
                VALUES (%s, %s, %s)
                """,
                (self.stato.id_accumulatore, round(livello_kwh, 2), round(potenza_kw, 2)),
            )

    def _chiudi_su_db(self) -> dict:
        s = self.stato
        costo = round(s.kwh_erogati * s.tariffa_kwh, 2)

        with get_connection() as conn:
            cur: MySQLCursorDict = conn.cursor(dictionary=True)

            acc = fetch_one(
                cur,
                """
                SELECT livello_corrente_kwh, percentuale_carica, soglia_minima_perc
                FROM accumulatori_stazione WHERE id_accumulatore = %s
                """,
                (s.id_accumulatore,),
            )
            livello_finale = float(acc["livello_corrente_kwh"]) if acc else 0.0
            perc_finale = float(acc["percentuale_carica"]) if acc else 0.0
            soglia_min = float(acc["soglia_minima_perc"]) if acc else 0.0
            stato_idle = stato_idle_da_percentuale(perc_finale, soglia_min)

            cur.execute(
                """
                UPDATE sessioni_ricarica
                SET data_fine = NOW(),
                    quantita_kwh = %s,
                    costo_totale = %s,
                    stato_pagamento = CASE WHEN %s > 0 THEN 'in_attesa_pagamento' ELSE 'gratuito' END
                WHERE id_sessione = %s AND data_fine IS NULL
                """,
                (round(s.kwh_erogati, 3), costo, costo, s.id_sessione),
            )

            cur.execute(
                """
                UPDATE accumulatori_stazione
                SET stato_operativo = %s,
                    data_ultimo_aggiornamento = NOW()
                WHERE id_accumulatore = %s
                """,
                (stato_idle, s.id_accumulatore),
            )

            cur.execute(
                """
                INSERT INTO storico_livello_batteria
                    (id_accumulatore, livello_kwh, potenza_istantanea_kw)
                VALUES (%s, %s, 0)
                """,
                (s.id_accumulatore, round(livello_finale, 2)),
            )

            cur.execute(
                """
                UPDATE punti_ricarica
                SET stato_hardware = 'online',
                    data_ultimo_heartbeat = NOW()
                WHERE id_punto = %s
                """,
                (s.id_punto,),
            )

            punto = fetch_one(
                cur,
                """
                SELECT identificativo_fisico, tipo_veicolo, potenza_max_kw, stato_hardware
                FROM punti_ricarica WHERE id_punto = %s
                """,
                (s.id_punto,),
            )
            accum = fetch_one(
                cur,
                """
                SELECT nome, livello_corrente_kwh, percentuale_carica, stato_operativo
                FROM accumulatori_stazione WHERE id_accumulatore = %s
                """,
                (s.id_accumulatore,),
            )

        return {
            "sessione": {
                "id_sessione": s.id_sessione,
                "quantita_kwh": round(s.kwh_erogati, 3),
                "costo_totale": costo,
                "motivo_stop": s.motivo_stop or "completata",
            },
            "colonnina": punto,
            "accumulatore": accum,
        }


def seleziona_accumulatore(cur: MySQLCursorDict, id_stazione: str, tipo_veicolo: str) -> Optional[dict]:
    """Sceglie l'accumulatore più adatto in base al tipo veicolo."""
    if tipo_veicolo == "auto":
        pattern = "%Auto%"
    else:
        pattern = "%Bici%"

    acc = fetch_one(
        cur,
        """
        SELECT id_accumulatore, nome, livello_corrente_kwh, capacita_utilizzabile_kwh,
               potenza_max_scarica_kw, percentuale_carica, stato_operativo
        FROM accumulatori_stazione
        WHERE id_stazione = %s AND nome LIKE %s
        ORDER BY livello_corrente_kwh DESC
        LIMIT 1
        """,
        (id_stazione, pattern),
    )
    if acc:
        return acc

    return fetch_one(
        cur,
        """
        SELECT id_accumulatore, nome, livello_corrente_kwh, capacita_utilizzabile_kwh,
               potenza_max_scarica_kw, percentuale_carica, stato_operativo
        FROM accumulatori_stazione
        WHERE id_stazione = %s
        ORDER BY livello_corrente_kwh DESC
        LIMIT 1
        """,
        (id_stazione,),
    )


def calcola_potenza_effettiva(potenza_punto: float, potenza_scarica_acc: Optional[float]) -> float:
    if potenza_scarica_acc is None:
        return potenza_punto
    return min(potenza_punto, float(potenza_scarica_acc))


def nuovo_id_sessione() -> str:
    return str(uuid.uuid4())
