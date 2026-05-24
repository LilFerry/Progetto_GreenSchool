"""
API REST del simulatore colonnine (procedura di sessione).
Non modifica lo schema del database: usa solo le tabelle esistenti.
"""

import logging
import sys

from flask import Flask, jsonify, request

from config import API_HOST, API_PORT
from session_manager import ConflictError, NotFoundError, SessionManager

app = Flask(__name__)
manager = SessionManager()

# ── Silenzia i log HTTP di Werkzeug (GET /sessione/... ogni secondo) ──────────
logging.getLogger("werkzeug").setLevel(logging.ERROR)

# Logger applicativo
sim_log = logging.getLogger("simulatore")
sim_log.setLevel(logging.INFO)
if not sim_log.handlers:
    _h = logging.StreamHandler(sys.stdout)
    _h.setFormatter(logging.Formatter("[%(asctime)s] %(message)s", datefmt="%H:%M:%S"))
    sim_log.addHandler(_h)
# ─────────────────────────────────────────────────────────────────────────────

# Mappa id_sessione -> riga ANSI da sovrascrivere al termine
# Ogni avvio scrive la riga e salva il "cursore" (tramite contatore righe stampate)
_sessione_linea: dict[str, int] = {}   # non usato con ANSI overwrite, vedi sotto


def _print_avvio(risultato: dict) -> None:
    """Stampa riga di avvio e la memorizza per sovrascrittura al termine."""
    id_s     = risultato.get("id_sessione", "?")
    id_s_short = id_s[:8] + "…"
    col      = risultato.get("identificativo", "?")
    potenza  = risultato.get("potenza_kw", "?")

    riga = f"▶  Sessione {id_s_short} | Colonnina: {col} | {potenza} kW"
    sim_log.info(riga)
    _sessione_linea[id_s] = col


def _print_termine(risultato: dict) -> None:
    """Sovrascrive la riga di avvio con i dati finali (kWh e accumulatore)."""
    sess = risultato.get("sessione", {})
    acc  = risultato.get("accumulatore", {})

    id_s = sess.get("id_sessione", "?")
    id_s_short = id_s[:8] + "…"
    kwh  = sess.get("quantita_kwh", 0)
    nome_acc = acc.get("nome", "?") if acc else "?"
    perc = acc.get("percentuale_carica", "?") if acc else "?"
    lvl  = acc.get("livello_corrente_kwh", "?") if acc else "?"

    col = _sessione_linea.pop(id_s, "?")

    # \033[F  → torna su di una riga
    # \033[2K → cancella la riga corrente
    # Poi ristampa la riga aggiornata
    sys.stdout.write(
        f"\033[F\033[2K"          # sale su e cancella la riga dell'avvio
        f"[termine] "
        f"■  Sessione {id_s_short} | Colonnina: {col} | "
        f"Erogati: {kwh} kWh | "
        f"Accumulatore: {nome_acc} → {perc}% ({lvl} kWh)\n"
    )
    sys.stdout.flush()


def _err(message: str, code: int = 400, details: dict | None = None):
    body = {"status": "error", "message": message}
    if details:
        body["details"] = details
    return jsonify(body), code


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "servizio": "simulatore_colonnine"})


@app.route("/simulazione/avvia", methods=["POST"])
def avvia_simulazione():
    """Avvia solo il motore di simulazione (sessione già creata da API PHP)."""
    data = request.get_json(silent=True) or {}
    id_sessione = data.get("id_sessione")
    if not id_sessione:
        return _err("Campo id_sessione obbligatorio")

    id_accumulatore = data.get("id_accumulatore")

    try:
        risultato = manager.avvia_simulazione(id_sessione, id_accumulatore=id_accumulatore)
        _print_avvio(risultato)
        return jsonify({"status": "success", "message": "Simulazione avviata", "data": risultato}), 201
    except NotFoundError as e:
        return _err(str(e), 404)
    except ConflictError as e:
        return _err(str(e), 409, e.details)
    except Exception as e:
        return _err(f"Errore interno: {e}", 500)


@app.route("/sessione/avvia", methods=["POST"])
def avvia_sessione():
    data = request.get_json(silent=True) or {}
    id_punto = data.get("id_punto")
    if not id_punto:
        return _err("Campo id_punto obbligatorio")

    try:
        risultato = manager.avvia_sessione(
            id_punto=id_punto,
            id_utente=data.get("id_utente"),
            metodo_avvio=data.get("metodo_avvio", "APP"),
            id_badge_usato=data.get("id_badge_usato"),
        )
        # avvia_sessione restituisce direttamente il dict (non dentro "data")
        _print_avvio(risultato)
        return jsonify({"status": "success", "message": "Sessione avviata", "data": risultato}), 201
    except NotFoundError as e:
        return _err(str(e), 404)
    except ConflictError as e:
        return _err(str(e), 409, e.details)
    except ValueError as e:
        return _err(str(e), 400)
    except Exception as e:
        return _err(f"Errore interno: {e}", 500)


@app.route("/sessione/termina", methods=["POST"])
def termina_sessione():
    data = request.get_json(silent=True) or {}
    id_sessione = data.get("id_sessione")
    id_punto = data.get("id_punto")
    if not id_sessione and not id_punto:
        return _err("Specificare id_sessione oppure id_punto")

    try:
        risultato = manager.termina_sessione(id_sessione=id_sessione, id_punto=id_punto)
        # risultato da ColonninaSimulator._chiudi_su_db ha chiavi: sessione, colonnina, accumulatore
        _print_termine(risultato)
        return jsonify({
            "status": "success",
            "message": "Sessione terminata; dati salvati su database e storico",
            "data": risultato,
        })
    except NotFoundError as e:
        return _err(str(e), 404)
    except Exception as e:
        return _err(f"Errore interno: {e}", 500)


@app.route("/sessione/<id_sessione>", methods=["GET"])
def get_sessione(id_sessione: str):
    try:
        return jsonify({"status": "success", "data": manager.stato_sessione(id_sessione)})
    except NotFoundError as e:
        return _err(str(e), 404)


@app.route("/sessioni/attive", methods=["GET"])
def sessioni_attive():
    attive = manager.sessioni_attive()
    return jsonify({"status": "success", "data": attive, "totale": len(attive)})


@app.route("/colonnina/<id_punto>", methods=["GET"])
def get_colonnina(id_punto: str):
    try:
        return jsonify({"status": "success", "data": manager.stato_colonnina(id_punto)})
    except NotFoundError as e:
        return _err(str(e), 404)


@app.route("/colonnina/<id_punto>/heartbeat", methods=["POST"])
def heartbeat(id_punto: str):
    from database import get_connection
    try:
        with get_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                "UPDATE punti_ricarica SET stato_hardware='online', data_ultimo_heartbeat=NOW() WHERE id_punto=%s",
                (id_punto,),
            )
            if cur.rowcount == 0:
                return _err("Colonnina non trovata", 404)
        return jsonify({"status": "success", "message": "Heartbeat registrato"})
    except Exception as e:
        return _err(f"Errore interno: {e}", 500)


def run():
    app.run(host=API_HOST, port=API_PORT, debug=False, threaded=True)


if __name__ == "__main__":
    run()