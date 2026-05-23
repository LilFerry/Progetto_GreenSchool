"""
API REST del simulatore colonnine (procedura di sessione).
Non modifica lo schema del database: usa solo le tabelle esistenti.
"""

from flask import Flask, jsonify, request

from config import API_HOST, API_PORT
from session_manager import ConflictError, NotFoundError, SessionManager

app = Flask(__name__)
manager = SessionManager()


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

    try:
        risultato = manager.avvia_simulazione(id_sessione)
        return jsonify({"status": "success", "message": "Simulazione avviata", "data": risultato}), 201
    except NotFoundError as e:
        return _err(str(e), 404)
    except ConflictError as e:
        return _err(str(e), 409, e.details)
    except Exception as e:
        return _err(f"Errore interno: {e}", 500)


@app.route("/sessione/avvia", methods=["POST"])
def avvia_sessione():
    """
    Avvia una sessione di ricarica e il simulatore Python associato.

    Body JSON:
      - id_punto (obbligatorio)
      - id_utente (opzionale)
      - metodo_avvio: APP | RFID | QR_CODE | ADMIN (default APP)
      - id_badge_usato (opzionale)
    """
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
    """
    Termina una sessione: aggiorna DB, accumulatore e storico.

    Body JSON (uno dei due):
      - id_sessione
      - id_punto
    """
    data = request.get_json(silent=True) or {}
    id_sessione = data.get("id_sessione")
    id_punto = data.get("id_punto")
    if not id_sessione and not id_punto:
        return _err("Specificare id_sessione oppure id_punto")

    try:
        risultato = manager.termina_sessione(id_sessione=id_sessione, id_punto=id_punto)
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
    """Mantiene la colonnina online (come farebbe il firmware reale)."""
    from database import get_connection

    try:
        with get_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                UPDATE punti_ricarica
                SET stato_hardware = 'online', data_ultimo_heartbeat = NOW()
                WHERE id_punto = %s
                """,
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
