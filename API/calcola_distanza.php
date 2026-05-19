<?php
// =========================================================================
// API RECOVERY: CALCOLO DISTANZA TRA COORDINATE (HAVERSINE)
// =========================================================================

// Impostiamo l'header JSON per una risposta standardizzata ed elegante
header('Content-Type: application/json');

// Recupero dei parametri inviati tramite GET con filtraggio e sanificazione base
$lat1 = filter_input(INPUT_GET, 'lat1', FILTER_VALIDATE_FLOAT);
$lon1 = filter_input(INPUT_GET, 'lon1', FILTER_VALIDATE_FLOAT);
$lat2 = filter_input(INPUT_GET, 'lat2', FILTER_VALIDATE_FLOAT);
$lon2 = filter_input(INPUT_GET, 'lon2', FILTER_VALIDATE_FLOAT);

// Verifica dei parametri obbligatori
if ($lat1 === false || $lon1 === false || $lat2 === false || $lon2 === false) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => "Parametri mancanti o non validi. Fornire lat1, lon1, lat2, lon2 come numeri decimali."
    ]);
    exit;
}

// Impostazioni di connessione al database
$host     = 'localhost';
$dbname   = 'stazione_ricarica';
$user     = 'root';
$password = '';
$charset  = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$dbname;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    // Apertura connessione PDO
    $pdo = new PDO($dsn, $user, $password, $options);

    // Le funzioni natie/custom SQL si richiamano dentro una query strutturata con SELECT
    $sql = "SELECT fn_calcola_distanza_km(:lat1, :lon1, :lat2, :lon2) AS distanza_km";
    $stmt = $pdo->prepare($sql);
    
    // Esecuzione protetta da SQL Injection mappando i segnaposto
    $stmt->execute([
        'lat1' => $lat1,
        'lon1' => $lon1,
        'lat2' => $lat2,
        'lon2' => $lon2
    ]);

    // Estrazione del record singolo
    $result = $stmt->fetch();
    $distanza = (float) $result['distanza_km'];

    // Output formattato in formato JSON pulito
    echo json_encode([
        "status" => "success",
        "input" => [
            "punto_a" => ["lat" => $lat1, "lon" => $lon1],
            "punto_b" => ["lat" => $lat2, "lon" => $lon2]
        ],
        "distanza_km" => $distanza
    ]);

} catch (\PDOException $e) {
    // Gestione degli errori del database
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Errore interno durante il calcolo geometrico: " . $e->getMessage()
    ]);
}
?>
