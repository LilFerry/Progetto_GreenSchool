# Progetto_GreenSchool
Istruzioni per l'installazione
-Avvia Apache e MySQL dal pannello XAMPP.
-In MySQL Workbench (o phpMyAdmin) eseguire il file: database.sql
-Copiare le cartelle in htdocs nel seguente modo: 
    cd "C:\GitHub\Progetto_GreenSchool\API"
    .\sync-xampp.ps1
-Avviare i servizi in 3 terminali diversi:
    Terminale 1 – Node (bridge):
    cd "C:\GitHub\Progetto_GreenSchool\GreenSchool(React)\server"
    node index.js
    Terminale 2 – Simulatore:
    cd "C:\Users\GitHub\Progetto_GreenSchool\simulatore"
    python main.py
    Terminale 3 – React:
    cd "C:\Users\GitHub\Progetto_GreenSchool\GreenSchool(React)\client"
    npm start