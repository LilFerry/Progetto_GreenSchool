<?php

require_once __DIR__ . '/db.php';

const ADMIN_UTENTE_ID = 'a1000000-0000-0000-0000-000000000001';
const ADMIN_EMAIL = 'admin@stazionericarica.it';

function nuovo_uuid_utente(): string
{
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function is_admin_utente(array $utente): bool
{
    $email = strtolower(trim((string) ($utente['email'] ?? '')));

    return ($utente['id_utente'] ?? '') === ADMIN_UTENTE_ID
        || $email === strtolower(ADMIN_EMAIL);
}

function formatta_utente_pubblico(array $row): array
{
    return [
        'id_utente' => $row['id_utente'],
        'email' => $row['email'],
        'cellulare' => $row['cellulare'],
        'nome' => $row['nome'],
        'cognome' => $row['cognome'],
        'tipo_account' => $row['tipo_account'],
        'attivo' => (bool) (int) ($row['attivo'] ?? 0),
        'is_admin' => is_admin_utente($row),
    ];
}

function verifica_password_utente(array $utente, string $password): bool
{
    $hash = $utente['password_hash'] ?? null;
    if ($hash) {
        return password_verify($password, $hash);
    }
    // Admin predefinito nel DB di esempio (prima della migrazione password)
    if (is_admin_utente($utente) && $password === 'admin123') {
        return true;
    }
    return false;
}

function colonna_password_esiste(PDO $pdo): bool
{
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }
    $stmt = $pdo->query("SHOW COLUMNS FROM utenti LIKE 'password_hash'");
    $cache = (bool) $stmt->fetch();
    return $cache;
}

function salva_password_utente(PDO $pdo, string $idUtente, string $password): void
{
    if (!colonna_password_esiste($pdo)) {
        return;
    }
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $pdo->prepare('UPDATE utenti SET password_hash = :h WHERE id_utente = :id')
        ->execute(['h' => $hash, 'id' => $idUtente]);
}

function valida_email(string $email): bool
{
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}
