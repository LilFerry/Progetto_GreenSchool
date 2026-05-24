# GreenSchool 🌱⚡

Piattaforma web per la gestione di stazioni di ricarica con accumulatori energetici: mappa interattiva, monitoraggio in tempo reale, gamification e pannello di amministrazione.

---

## Architettura

```
Browser (React :3000)
        │
        ▼
Node.js Bridge (:3001)          ← proxy verso PHP e simulatore
        │
        ├──► PHP API (XAMPP :80) ──► MySQL
        │
        └──► Simulatore Python (:5050)
                    │
                    └──► tick ricarica → aggiorna DB + storico_livello_batteria
```

---

## Requisiti

| Strumento | Versione minima |
|-----------|----------------|
| Node.js   | >= 14.0.0      |
| npm       | incluso con Node.js |
| Python    | >= 3.10        |
| XAMPP     | Apache + MySQL |

---

## Installazione

### 1. Clona il repository

```bash
git clone <url-repository>
cd Progetto_GreenSchool
```

### 2. Configura il database

Avvia **Apache** e **MySQL** dal pannello XAMPP, poi esegui il file SQL in MySQL Workbench o phpMyAdmin:

```
Progetto_GreenSchool/database.sql
```

### 3. Copia i file PHP in htdocs

Apri PowerShell nella cartella del progetto ed esegui:

```powershell
cd API
.\sync-xampp.ps1
```

Oppure copia manualmente la cartella `API/` in `C:\xampp\htdocs\`.

> Se i file PHP non sono su `http://localhost/`, imposta la variabile d'ambiente:
> ```bash
> set PHP_API_BASE=http://localhost/Progetto_GreenSchool/API/
> ```

### 4. Installa le dipendenze Node.js

```bash
cd GreenSchool(React)
npm run install-all
```

### 5. Installa le dipendenze Python

```bash
cd simulatore
pip install -r requirements.txt
```

---

## Avvio

Avvia i tre servizi in **terminali separati**, nell'ordine indicato.

**Terminale 1 — Simulatore Python**
```bash
cd simulatore
python main.py
```
> API disponibile su `http://127.0.0.1:5050`

**Terminale 2 — Backend Node.js**
```bash
cd GreenSchool(React)
npm run server
```
> Bridge disponibile su `http://localhost:3001`

**Terminale 3 — Frontend React**
```bash
cd GreenSchool(React)
npm run client
```
> Interfaccia disponibile su `http://localhost:3000`

---

## Comandi utili

Dalla cartella `GreenSchool(React)/`:

| Comando | Descrizione |
|---------|-------------|
| `npm run install-all` | Installa tutte le dipendenze (client + server) |
| `npm start` | Avvia client e server insieme |
| `npm run server` | Avvia solo il backend Node.js |
| `npm run client` | Avvia solo il frontend React |
| `npm run dev` | Modalità sviluppo con hot reload |

---

## Pagine disponibili

| Pagina | Percorso |
|--------|----------|
| Dashboard | `/` |
| Mappa interattiva | `/mappa` |
| Storico sessioni | `/storico` |
| Gamification | `/game` |
| Pannello Admin | `/admin` |

---

## Troubleshooting

**API PHP non raggiungibile all'avvio del server Node**
Verifica che Apache sia attivo in XAMPP e che i file siano stati copiati in `htdocs`. Riesegui `.\API\sync-xampp.ps1`.

**Porta 3000 o 3001 già in uso**
```bash
# Trova e termina il processo (Windows)
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

**node_modules corrotto**
```bash
rm -rf node_modules client/node_modules server/node_modules
npm run install-all
```

**Simulatore non si connette al database**
Verifica le variabili d'ambiente per MySQL (vedi `simulatore/config.py`):
```
GREENSCHOOL_DB_HOST, GREENSCHOOL_DB_USER, GREENSCHOOL_DB_PASSWORD, GREENSCHOOL_DB_NAME
```

---

## Stack tecnologico

- **Frontend**: React 18, React Router, Leaflet (OpenStreetMap)
- **Backend**: Node.js, Express, Axios
- **Simulatore**: Python, Flask
- **API**: PHP
- **Database**: MySQL (XAMPP)
