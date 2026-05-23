<?php
// POST JSON: email, password

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/utente_helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Metodo non consentito. Usare POST.', 405);
}

$data = read_json_body();
$email = strtolower(trim((string) ($data['email'] ?? '')));
$password = (string) ($data['password'] ?? '');

if ($email === '' || $password === '') {
    json_error('Email e password obbligatorie', 400);
}

try {
    $pdo = db_connect();
    $stmt = $pdo->prepare(
        'SELECT * FROM utenti WHERE LOWER(email) = :email LIMIT 1'
    );
    $stmt->execute(['email' => $email]);
    $utente = $stmt->fetch();

    if (!$utente) {
        json_error('Credenziali non valide', 401);
    }
    if (!(int) $utente['attivo']) {
        json_error('Account disattivato', 403);
    }
    if (!verifica_password_utente($utente, $password)) {
        json_error('Credenziali non valide', 401);
    }

    if (colonna_password_esiste($pdo) && empty($utente['password_hash'])) {
        salva_password_utente($pdo, $utente['id_utente'], $password);
    }

    $pubblico = formatta_utente_pubblico($utente);

    json_response([
        'status' => 'success',
        'message' => 'Accesso effettuato',
        'data' => ['utente' => $pubblico],
    ]);
} catch (Throwable $e) {
    json_error('Errore login: ' . $e->getMessage(), 500);
}
