# API sessioni di ricarica (PHP)

## File

| File | Ruolo |
|------|--------|
| `sessione_avvia.php` | Crea sessione su DB, gestisce concorrenza, avvia simulatore Python |
| `sessione_termina.php` | Chiude sessione via simulatore, restituisce dati aggiornati |
| `sessione_stato.php` | Polling stato sessione |
| `colonnine_stazione.php` | Colonnine e disponibilità per stazione/accumulatore |
| `includes/` | DB, client simulatore, helper |

## Deploy XAMPP

Copia la cartella `API` in:

`C:\xampp\htdocs\Progetto_GreenSchool\API\`

URL esempio: `http://localhost/Progetto_GreenSchool/API/sessione_avvia.php`

Se usi un percorso diverso, imposta nel server Node:

```powershell
$env:PHP_API_BASE = "http://localhost/TUO_PERCORSO/API/"
cd GreenSchool(React)/server
node index.js
```

## Simulatore Python

Deve essere in esecuzione prima di avviare una sessione:

```bash
cd simulatore
python main.py
```

Variabile opzionale per PHP: `SIMULATORE_URL=http://127.0.0.1:5050`

## Concorrenza

- Una sessione aperta per `id_punto` (lock `FOR UPDATE`)
- Un utente non può avere due sessioni aperte contemporaneamente
- Lock sull'accumulatore durante l'avvio
