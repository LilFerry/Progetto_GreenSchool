<?php
// POST JSON: nome, cognome, email, password, cellulare (opz.)

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
$nome = trim((string) ($data['nome'] ?? ''));
$cognome = trim((string) ($data['cognome'] ?? ''));
$email = strtolower(trim((string) ($data['email'] ?? '')));
$password = (string) ($data['password'] ?? '');
$cellulare = trim((string) ($data['cellulare'] ?? ''));

if ($nome === '' || $cognome === '') {
    json_error('Nome e cognome obbligatori', 400);
}
if (!valida_email($email)) {
    json_error('Email non valida', 400);
}
if (strlen($password) < 6) {
    json_error('La password deve avere almeno 6 caratteri', 400);
}
if (strtolower($email) === strtolower(ADMIN_EMAIL)) {
    json_error('Questa email è riservata all\'amministratore', 409);
}

try {
    $pdo = db_connect();

    $stmt = $pdo->prepare('SELECT id_utente FROM utenti WHERE LOWER(email) = :email LIMIT 1');
    $stmt->execute(['email' => $email]);
    if ($stmt->fetch()) {
        json_error('Email già registrata', 409);
    }

    $idUtente = nuovo_uuid_utente();
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $hasPasswordCol = colonna_password_esiste($pdo);

    if ($hasPasswordCol) {
        $ins = $pdo->prepare(
            'INSERT INTO utenti (id_utente, email, password_hash, cellulare, nome, cognome, tipo_account, attivo)
             VALUES (:id, :email, :hash, :cell, :nome, :cognome, :tipo, 1)'
        );
        $ins->execute([
            'id' => $idUtente,
            'email' => $email,
            'hash' => $hash,
            'cell' => $cellulare !== '' ? $cellulare : null,
            'nome' => $nome,
            'cognome' => $cognome,
            'tipo' => 'completo',
        ]);
    } else {
        $ins = $pdo->prepare(
            'INSERT INTO utenti (id_utente, email, cellulare, nome, cognome, tipo_account, attivo)
             VALUES (:id, :email, :cell, :nome, :cognome, :tipo, 1)'
        );
        $ins->execute([
            'id' => $idUtente,
            'email' => $email,
            'cell' => $cellulare !== '' ? $cellulare : null,
            'nome' => $nome,
            'cognome' => $cognome,
            'tipo' => 'completo',
        ]);
    }

    $stmt = $pdo->prepare('SELECT * FROM utenti WHERE id_utente = :id');
    $stmt->execute(['id' => $idUtente]);
    $utente = $stmt->fetch();

    json_response([
        'status' => 'success',
        'message' => 'Registrazione completata',
        'data' => ['utente' => formatta_utente_pubblico($utente)],
    ], 201);
} catch (Throwable $e) {
    json_error('Errore registrazione: ' . $e->getMessage(), 500);
}
