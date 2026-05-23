<?php
/**
 * Connessione PDO condivisa (XAMPP / stazione_ricarica).
 */

function db_connect(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $host = getenv('GREENSCHOOL_DB_HOST') ?: '127.0.0.1';
    $dbname = getenv('GREENSCHOOL_DB_NAME') ?: 'stazione_ricarica';
    $user = getenv('GREENSCHOOL_DB_USER') ?: 'root';
    $pass = getenv('GREENSCHOOL_DB_PASSWORD') ?: '';

    $pdo = new PDO(
        "mysql:host={$host};dbname={$dbname};charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );

    return $pdo;
}

function json_response(array $payload, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function json_error(string $message, int $code = 400, array $details = []): void
{
    $body = ['status' => 'error', 'message' => $message];
    if ($details !== []) {
        $body['details'] = $details;
    }
    json_response($body, $code);
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}
