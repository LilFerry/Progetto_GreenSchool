# GreenSchool 🌱⚡

Progetto web per la gestione di stazioni di accumulatori energetici con mappa interattiva e monitoraggio in tempo reale.

## 📋 Requisiti

- **Node.js** >= 14.0.0 ([Scarica qui](https://nodejs.org/))
- **npm** (incluso con Node.js)

## 🚀 Installazione e Avvio Rapido

### 1️⃣ Clona il repository
```bash
git clone <url-repository>
cd greenschool
```

### 2️⃣ Installa tutte le dipendenze (client + server)
```bash
npm run install-all
```

Questo comando installerà automaticamente:
- Dipendenze della root
- Dipendenze di `client/`
- Dipendenze di `server/`

### 3️⃣ Avvia il progetto
```bash
npm start
```

Questo avvierà automaticamente:
- **Frontend**: http://localhost:3000 (React)
- **Backend**: http://localhost:3001 (Express)

> ℹ️ Assicurati che il tuo PHP API sia raggiungibile su `http://localhost/Ye` (configurabile in `server/index.js`)

---

## 📁 Struttura del Progetto

```
greenschool/
├── client/              # Frontend React
│   ├── src/
│   │   ├── App.js      # Componente principale
│   │   └── App.css     # Stili
│   └── package.json
├── server/             # Backend Express
│   ├── index.js        # Server principale
│   └── package.json
├── package.json        # Root package.json con script
└── README.md
```

---

## 📦 Dipendenze Installate

### Frontend (client/)
- **react** ^18.2.0 - Libreria UI
- **react-dom** ^18.2.0 - Rendering DOM
- **react-router-dom** ^6.20.0 - Routing SPA
- **react-scripts** 5.0.1 - Build tools
- **leaflet** ^1.9.4 - Mappa interattiva
- **react-leaflet** ^4.2.1 - Componenti React per Leaflet
- **axios** ^1.6.5 - HTTP client

### Backend (server/)
- **express** ^4.18.2 - Framework web
- **cors** ^2.8.5 - Gestione CORS
- **axios** ^1.6.5 - HTTP client per API PHP
- **nodemon** ^3.0.2 - Auto-reload (dev)

---

## 🎮 Comandi Disponibili

### Dalla root del progetto

| Comando | Descrizione |
|---------|-------------|
| `npm run install-all` | Installa tutte le dipendenze |
| `npm start` | Avvia client e server contemporaneamente |
| `npm run server` | Avvia solo il server (porta 3001) |
| `npm run client` | Avvia solo il client (porta 3000) |
| `npm run dev` | Modalità sviluppo con hot reload |

### Dalla cartella server/
```bash
cd server
npm start      # Avvia il server
npm run dev    # Avvia con nodemon (auto-reload)
```

### Dalla cartella client/
```bash
cd client
npm start      # Avvia React dev server
npm run build  # Build per produzione
```

---

## ⚙️ Configurazione

### Modifica API PHP
Se la tua API PHP non è su `http://localhost/Ye`, modifica `server/index.js`:

```javascript
const PHP_API_BASE = 'http://localhost/Ye'; // ← Cambia questo
```

### Porta del server
Per cambiare la porta del server (default 3001), modifica in `server/index.js`:

```javascript
const PORT = 3001; // ← Cambia questo
```

---

## 🐛 Troubleshooting

### Errore: "Cannot find module 'express'"
```bash
cd server && npm install
```

### Errore: "Cannot find module 'react'"
```bash
cd client && npm install
```

### La mappa non si carica
Verifica che Leaflet sia installato correttamente:
```bash
cd client && npm install leaflet react-leaflet
```

### Errore CORS
Assicurati che il server Express sia in esecuzione e che CORS sia abilitato in `server/index.js`.

---

## 📱 Pagine Disponibili

| Pagina | Percorso | Status |
|--------|----------|--------|
| Dashboard | `/` | 🔲 In preparazione |
| Storico | `/storico` | 🔲 In preparazione |
| **Mappa** | `/mappa` | ✅ Implementata |
| Scuola | `/scuola` | 🔲 In preparazione |
| Gamification | `/game` | 🔲 In preparazione |
| Admin | `/admin` | 🔲 In preparazione |

---

## 📚 Tecnologie Utilizzate

- **Frontend**: React 18 + React Router + Leaflet
- **Backend**: Node.js + Express
- **Mappa**: OpenStreetMap + Leaflet
- **HTTP**: Axios

---

## 📝 Note

- Il frontend comunica con il backend via `http://localhost:3001/api`
- Il backend funge da proxy verso l'API PHP su `http://localhost/Ye`
- La mappa mostra le stazioni e i loro accumulatori in tempo reale

---

## 👥 Contributi

Per contribuire, crea un fork del repository e invia una pull request.

---

## 📄 Licenza

Questo progetto è privato. Tutti i diritti riservati.
