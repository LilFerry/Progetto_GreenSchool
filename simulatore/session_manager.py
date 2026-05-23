"""
Gestione sessioni di ricarica multi-utente.
Una colonnina (id_punto) può avere al massimo una sessione attiva;
più utenti possono ricaricare contemporaneamente su colonnine diverse.
"""

from __future__ import annotations

import threading
from typing import Any, Optional

from mysql.connector.cursor import MySQLCursorDict

from colonnina_sim import (
    ColonninaSimulator,
    StatoSessione,
    calcola_potenza_effettiva,
    nuovo_id_sessione,
    seleziona_accumulatore,
)
from config import METODI_AVVIO
from database import fetch_one, get_connection


class SessionManager:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        # id_sessione -> simulatore attivo
        self._simulatori: dict[str, ColonninaSimulator] = {}
        # id_punto -> id_sessione (accesso esclusivo per colonnina)
        self._punti_occupati: dict[str, str] = {}

    def _on_sessione_finale(self, id_sessione: str, risultato: dict) -> None:
        with self._lock:
            sim = self._simulatori.pop(id_sessione, None)
            if sim:
                self._punti_occupati.pop(sim.stato.id_punto, None)

    def avvia_simulazione(self, id_sessione: str) -> dict[str, Any]:
        """Avvia il thread di simulazione per una sessione già creata da PHP."""
        with self._lock:
            if id_sessione in self._simulatori:
                raise ConflictError("Simulazione già attiva", {"id_sessione": id_sessione})

        with get_connection() as conn:
            cur: MySQLCursorDict = conn.cursor(dictionary=True)
            sess = fetch_one(
                cur,
                """
                SELECT s.id_sessione, s.id_punto, s.id_utente, s.data_fine,
                       p.id_stazione, p.identificativo_fisico, p.tipo_veicolo,
                       p.potenza_max_kw, p.tariffa_predefinita
                FROM sessioni_ricarica s
                JOIN punti_ricarica p ON p.id_punto = s.id_punto
                WHERE s.id_sessione = %s
                """,
                (id_sessione,),
            )
            if not sess:
                raise NotFoundError("Sessione non trovata")
            if sess["data_fine"] is not None:
                raise ConflictError("Sessione già chiusa")

            id_punto = sess["id_punto"]
            if id_punto in self._punti_occupati:
                raise ConflictError(
                    "Simulazione già attiva su questa colonnina",
                    {"id_sessione_attiva": self._punti_occupati[id_punto]},
                )

            acc = seleziona_accumulatore(cur, sess["id_stazione"], sess["tipo_veicolo"])
            if not acc:
                raise ConflictError("Nessun accumulatore per la stazione")

            potenza_punto = float(sess["potenza_max_kw"] or 7.0)
            potenza = calcola_potenza_effettiva(potenza_punto, acc.get("potenza_max_scarica_kw"))
            tariffa = float(sess["tariffa_predefinita"] or 0.0)

        stato = StatoSessione(
            id_sessione=id_sessione,
            id_punto=id_punto,
            id_stazione=sess["id_stazione"],
            id_utente=sess["id_utente"],
            id_accumulatore=acc["id_accumulatore"],
            potenza_kw=potenza,
            tariffa_kwh=tariffa,
        )
        sim = ColonninaSimulator(stato, self._on_sessione_finale)

        with self._lock:
            self._simulatori[id_sessione] = sim
            self._punti_occupati[id_punto] = id_sessione

        sim.avvia()

        return {
            "id_sessione": id_sessione,
            "id_punto": id_punto,
            "identificativo": sess["identificativo_fisico"],
            "tipo_veicolo": sess["tipo_veicolo"],
            "potenza_kw": potenza,
            "stato": "simulazione_attiva",
        }

    def avvia_sessione(
        self,
        id_punto: str,
        id_utente: Optional[str],
        metodo_avvio: str,
        id_badge_usato: Optional[int] = None,
    ) -> dict[str, Any]:
        if metodo_avvio not in METODI_AVVIO:
            raise ValueError(f"metodo_avvio non valido. Valori: {', '.join(METODI_AVVIO)}")

        with self._lock:
            if id_punto in self._punti_occupati:
                raise ConflictError(
                    "Colonnina già in uso",
                    {"id_sessione_attiva": self._punti_occupati[id_punto]},
                )

        with get_connection() as conn:
            cur: MySQLCursorDict = conn.cursor(dictionary=True)

            punto = fetch_one(
                cur,
                """
                SELECT p.id_punto, p.id_stazione, p.identificativo_fisico, p.tipo_veicolo,
                       p.potenza_max_kw, p.tariffa_predefinita, p.stato_hardware,
                       p.data_ultimo_heartbeat
                FROM punti_ricarica p
                WHERE p.id_punto = %s
                """,
                (id_punto,),
            )
            if not punto:
                raise NotFoundError("Punto di ricarica non trovato")

            if punto["stato_hardware"] in ("guasto", "manutenzione_programmata"):
                raise ConflictError("Colonnina fuori servizio", {"stato_hardware": punto["stato_hardware"]})

            sessione_aperta = fetch_one(
                cur,
                """
                SELECT id_sessione FROM sessioni_ricarica
                WHERE id_punto = %s AND data_fine IS NULL
                LIMIT 1
                """,
                (id_punto,),
            )
            if sessione_aperta:
                raise ConflictError(
                    "Esiste già una sessione aperta su questo punto",
                    {"id_sessione": sessione_aperta["id_sessione"]},
                )

            if id_utente:
                utente = fetch_one(
                    cur,
                    "SELECT id_utente, attivo FROM utenti WHERE id_utente = %s",
                    (id_utente,),
                )
                if not utente:
                    raise NotFoundError("Utente non trovato")
                if not utente["attivo"]:
                    raise ConflictError("Utente non attivo")

            acc = seleziona_accumulatore(cur, punto["id_stazione"], punto["tipo_veicolo"])
            if not acc:
                raise ConflictError("Nessun accumulatore disponibile per questa stazione")

            if acc["stato_operativo"] in ("guasto", "manutenzione"):
                raise ConflictError("Accumulatore non operativo", {"stato": acc["stato_operativo"]})

            if float(acc["livello_corrente_kwh"]) <= 0.01:
                raise ConflictError("Accumulatore scarico, ricarica non avviabile")

            potenza_punto = float(punto["potenza_max_kw"] or 7.0)
            potenza = calcola_potenza_effettiva(potenza_punto, acc.get("potenza_max_scarica_kw"))
            tariffa = float(punto["tariffa_predefinita"] or 0.0)
            id_sessione = nuovo_id_sessione()

            cur.execute(
                """
                INSERT INTO sessioni_ricarica
                    (id_sessione, id_utente, id_punto, id_badge_usato, metodo_avvio,
                     tipo_tariffa_applicata, costo_totale, stato_pagamento)
                VALUES (%s, %s, %s, %s, %s, 'standard', 0.00, 'non_richiesto')
                """,
                (id_sessione, id_utente, id_punto, id_badge_usato, metodo_avvio),
            )

            cur.execute(
                """
                UPDATE punti_ricarica
                SET stato_hardware = 'online', data_ultimo_heartbeat = NOW()
                WHERE id_punto = %s
                """,
                (id_punto,),
            )

            cur.execute(
                """
                UPDATE accumulatori_stazione
                SET stato_operativo = 'scarica', data_ultimo_aggiornamento = NOW()
                WHERE id_accumulatore = %s
                """,
                (acc["id_accumulatore"],),
            )

        stato = StatoSessione(
            id_sessione=id_sessione,
            id_punto=id_punto,
            id_stazione=punto["id_stazione"],
            id_utente=id_utente,
            id_accumulatore=acc["id_accumulatore"],
            potenza_kw=potenza,
            tariffa_kwh=tariffa,
        )
        sim = ColonninaSimulator(stato, self._on_sessione_finale)

        with self._lock:
            self._simulatori[id_sessione] = sim
            self._punti_occupati[id_punto] = id_sessione

        sim.avvia()

        return {
            "id_sessione": id_sessione,
            "id_punto": id_punto,
            "identificativo": punto["identificativo_fisico"],
            "tipo_veicolo": punto["tipo_veicolo"],
            "potenza_kw": potenza,
            "accumulatore": {
                "id": acc["id_accumulatore"],
                "nome": acc["nome"],
                "livello_kwh": acc["livello_corrente_kwh"],
                "percentuale": acc["percentuale_carica"],
            },
            "stato": "in_corso",
        }

    def termina_sessione(
        self,
        id_sessione: Optional[str] = None,
        id_punto: Optional[str] = None,
    ) -> dict[str, Any]:
        with self._lock:
            if not id_sessione and id_punto:
                id_sessione = self._punti_occupati.get(id_punto)
            if not id_sessione:
                raise NotFoundError("Sessione non trovata o già terminata")
            sim = self._simulatori.get(id_sessione)

        if sim:
            return sim.ferma("richiesta_utente")

        # Sessione nel DB ma non in memoria (es. riavvio server)
        return self._chiudi_sessione_orfana(id_sessione)

    def stato_sessione(self, id_sessione: str) -> dict[str, Any]:
        with self._lock:
            sim = self._simulatori.get(id_sessione)

        if sim:
            snap = sim.snapshot()
            snap["stato"] = "in_corso" if snap["attiva"] else "in_chiusura"
            return snap

        with get_connection() as conn:
            cur: MySQLCursorDict = conn.cursor(dictionary=True)
            row = fetch_one(
                cur,
                """
                SELECT id_sessione, id_punto, id_utente, data_inizio, data_fine,
                       quantita_kwh, costo_totale
                FROM sessioni_ricarica
                WHERE id_sessione = %s
                """,
                (id_sessione,),
            )
        if not row:
            raise NotFoundError("Sessione non trovata")
        row["stato"] = "in_corso" if row["data_fine"] is None else "terminata"
        return row

    def stato_colonnina(self, id_punto: str) -> dict[str, Any]:
        with self._lock:
            id_sess = self._punti_occupati.get(id_punto)
            sim = self._simulatori.get(id_sess) if id_sess else None

        with get_connection() as conn:
            cur: MySQLCursorDict = conn.cursor(dictionary=True)
            punto = fetch_one(
                cur,
                """
                SELECT p.*, s.nome AS nome_stazione
                FROM punti_ricarica p
                JOIN stazioni s ON s.id_stazione = p.id_stazione
                WHERE p.id_punto = %s
                """,
                (id_punto,),
            )
            if not punto:
                raise NotFoundError("Colonnina non trovata")

            acc = seleziona_accumulatore(cur, punto["id_stazione"], punto["tipo_veicolo"])

        info: dict[str, Any] = {
            "colonnina": {
                "id_punto": id_punto,
                "identificativo": punto["identificativo_fisico"],
                "tipo_veicolo": punto["tipo_veicolo"],
                "stato_hardware": punto["stato_hardware"],
                "heartbeat": str(punto["data_ultimo_heartbeat"]) if punto["data_ultimo_heartbeat"] else None,
                "stazione": punto["nome_stazione"],
            },
            "accumulatore": acc,
            "sessione_attiva": None,
        }

        if sim:
            info["sessione_attiva"] = sim.snapshot()
            info["occupata"] = True
        else:
            info["occupata"] = id_sess is not None

        return info

    def sessioni_attive(self) -> list[dict]:
        with self._lock:
            return [s.snapshot() for s in self._simulatori.values()]

    def _chiudi_sessione_orfana(self, id_sessione: str) -> dict[str, Any]:
        with get_connection() as conn:
            cur: MySQLCursorDict = conn.cursor(dictionary=True)
            sess = fetch_one(
                cur,
                """
                SELECT s.id_sessione, s.id_punto, s.quantita_kwh,
                       p.id_stazione, p.tipo_veicolo, p.tariffa_predefinita
                FROM sessioni_ricarica s
                JOIN punti_ricarica p ON p.id_punto = s.id_punto
                WHERE s.id_sessione = %s AND s.data_fine IS NULL
                """,
                (id_sessione,),
            )
            if not sess:
                raise NotFoundError("Nessuna sessione aperta con questo id")

            acc = seleziona_accumulatore(cur, sess["id_stazione"], sess["tipo_veicolo"])
            kwh = float(sess["quantita_kwh"] or 0)
            tariffa = float(sess["tariffa_predefinita"] or 0)
            costo = round(kwh * tariffa, 2)

            cur.execute(
                """
                UPDATE sessioni_ricarica
                SET data_fine = NOW(), quantita_kwh = %s, costo_totale = %s
                WHERE id_sessione = %s
                """,
                (kwh, costo, id_sessione),
            )
            if acc:
                cur.execute(
                    """
                    UPDATE accumulatori_stazione
                    SET stato_operativo = 'standby'
                    WHERE id_accumulatore = %s
                    """,
                    (acc["id_accumulatore"],),
                )

        return {
            "sessione": {
                "id_sessione": id_sessione,
                "quantita_kwh": kwh,
                "costo_totale": costo,
                "motivo_stop": "chiusura_orfana",
            },
        }


class NotFoundError(Exception):
    pass


class ConflictError(Exception):
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(message)
        self.details = details or {}
