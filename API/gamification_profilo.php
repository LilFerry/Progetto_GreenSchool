<?php
// GET ?id_utente=... — profilo XP, livello e missioni giornaliere (solo utenti)

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/gamification_helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Metodo non consentito. Usare GET.', 405);
}

$idUtente = trim((string) ($_GET['id_utente'] ?? ''));
if ($idUtente === '') {
    json_error('Parametro id_utente obbligatorio', 400);
}

try {
    $pdo = db_connect();
    $data = gamification_profilo_completo($pdo, $idUtente);

    if ($data === null) {
        if (!gamification_tabelle_presenti($pdo)) {
            json_error(
                'Gamification non installata. Esegui database/gamification_migration.sql sul database.',
                503
            );
        }
        json_error('Profilo gamification non disponibile per questo account', 403);
    }

    json_response(['status' => 'success', 'data' => $data]);
} catch (Throwable $e) {
    json_error('Errore profilo gamification: ' . $e->getMessage(), 500);
}
