"""Configurazione connessione MySQL (XAMPP) e parametri simulazione."""

import os

DB_HOST = os.getenv("GREENSCHOOL_DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("GREENSCHOOL_DB_PORT", "3306"))
DB_NAME = os.getenv("GREENSCHOOL_DB_NAME", "stazione_ricarica")
DB_USER = os.getenv("GREENSCHOOL_DB_USER", "root")
DB_PASSWORD = os.getenv("GREENSCHOOL_DB_PASSWORD", "")

# Intervallo tick simulazione ricarica (secondi)
TICK_INTERVAL_SEC = float(os.getenv("SIM_TICK_SEC", "5"))

# Ogni quanti secondi scrivere una misura nello storico batteria
STORICO_INTERVAL_SEC = float(os.getenv("SIM_STORICO_SEC", "60"))

# Porta API Flask
API_HOST = os.getenv("SIM_API_HOST", "127.0.0.1")
API_PORT = int(os.getenv("SIM_API_PORT", "5050"))

METODI_AVVIO = ("APP", "RFID", "QR_CODE", "ADMIN")
