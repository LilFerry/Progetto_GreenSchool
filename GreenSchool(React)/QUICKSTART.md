# ⚡ Quick Start

## 🎯 In 3 step avvia il progetto

### Step 1: Installa dipendenze
```bash
npm run install-all
```
⏱️ Tempo: ~2-3 minuti (dipende dalla connessione)

### Step 2: Avvia
```bash
npm start
```
✅ Vedrai:
```
Server avviato su http://localhost:3001
Frontend avviato su http://localhost:3000
```

### Step 3: Apri il browser
Vai su **http://localhost:3000** e clicca su "Mappa" nel menu

---

## 🔧 Se qualcosa non funziona

### Porta 3000 o 3001 già in uso?
```bash
# Trova il processo
lsof -i :3000
lsof -i :3001

# Uccidi il processo (macOS/Linux)
kill -9 <PID>
```

### node_modules corrotto?
```bash
rm -rf node_modules client/node_modules server/node_modules package-lock.json
npm run install-all
```

### Errore di permessi (Linux/macOS)?
```bash
sudo chown -R $USER .
npm run install-all
```

---

## 📖 Documentazione completa
Leggi **README.md** per dettagli su comandi, struttura e configurazione.
