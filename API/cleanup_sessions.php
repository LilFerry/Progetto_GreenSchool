<?php
// =========================================================================
// SCRIPT DI MANUTENZIONE: CHIUSURA SESSIONI STALE
// =========================================================================

// Impostazioni di connessione al database
$host     = 'localhost';
$dbname   = 'stazione_ricarica';
$user     = 'root';
$password = "";

$dsn = "mysql:host=$host;dbname=$dbname";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    // Apertura connessione PDO
    $pdo = new PDO($dsn, $user, $password, $options);

    // Preparazione ed esecuzione della Stored Procedure
    $stmt = $pdo->prepare("CALL sp_cleanup_stale_sessions()");
    $stmt->execute();

    // Risposta di successo
    echo json_encode([
        "status" => "success",
        "message" => "Manutenzione completata: le sessioni stale sono state chiuse correttamente."
    ]);

} catch (\PDOException $e) {
    // Gestione degli errori in caso di fallimento della query o connessione
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Errore durante l'esecuzione della manutenzione: " . $e->getMessage()
    ]);
}
?>
