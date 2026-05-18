<?php
// =========================================================================
// SCRIPT DI MANUTENZIONE: ELIMINAZIONE STORICO BATTERIE > 90 GIORNI
// =========================================================================

// Impostazioni di connessione al database
$host     = 'localhost';
$dbname   = 'stazione_ricarica';
$user     = 'root';
$password = "";
;

$dsn = "mysql:host=$host;dbname=$dbname;";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    // Apertura connessione PDO
    $pdo = new PDO($dsn, $user, $password, $options);

    // Preparazione ed esecuzione della Stored Procedure
    $stmt = $pdo->prepare("CALL sp_purge_battery_history()");
    $stmt->execute();

    // Risposta di successo
    echo json_encode([
        "status" => "success",
        "message" => "Manutenzione completata: lo storico dei livelli batteria antecedente a 90 giorni è stato rimosso."
    ]);

} catch (\PDOException $e) {
    // Gestione degli errori
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Errore durante il purge dello storico: " . $e->getMessage()
    ]);
}
?>
