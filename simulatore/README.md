# Simulatore colonnine (motore Python)

Servizio **secondario**: simula l'erogazione di energia (tick, accumulatore, storico).  
La **gestione sessioni** (API, concorrenza, INSERT sessione) è in **PHP** (`API/sessione_*.php`).

## Flusso

```
React → Node (3001) → PHP API (sessione_avvia.php) → MySQL
                              ↓
                    Simulatore Python (5050) /simulazione/avvia
                              ↓
                    tick ricarica → aggiorna DB + storico_livello_batteria
                              ↓
                    PHP sessione_termina.php → Python /sessione/termina
```

## Avvio

```bash
cd simulatore
pip install -r requirements.txt
python main.py
```

## Endpoint (uso interno da PHP)

| Metodo | Path | Descrizione |
|--------|------|-------------|
| POST | `/simulazione/avvia` | `{ "id_sessione": "..." }` — sessione già in DB |
| POST | `/sessione/termina` | Chiude simulazione e persiste kWh |
| GET | `/sessione/<id>` | Stato live simulazione |

L'endpoint `POST /sessione/avvia` resta per test manuali senza PHP.

## Configurazione

Variabili come in `config.py` e `GREENSCHOOL_DB_*` per MySQL (XAMPP).
