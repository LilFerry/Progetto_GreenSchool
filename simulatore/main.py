"""Avvio del simulatore colonnine GreenSchool."""

from api import run


if __name__ == "__main__":
    print("Simulatore colonnine GreenSchool")
    print("API disponibile su http://127.0.0.1:5050")
    print("  POST /sessione/avvia   - avvia ricarica")
    print("  POST /sessione/termina - termina e salva su DB/storico")
    print("  GET  /sessione/<id>    - stato sessione")
    print("  GET  /colonnina/<id>   - stato colonnina")
    run()
