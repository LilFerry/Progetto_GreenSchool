<?php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/utente_helpers.php';

function richiedi_admin(PDO $pdo, string $idUtente): array
{
    if ($idUtente === '') {
        json_error('id_utente admin obbligatorio', 401);
    }
    $stmt = $pdo->prepare('SELECT * FROM utenti WHERE id_utente = :id LIMIT 1');
    $stmt->execute(['id' => $idUtente]);
    $row = $stmt->fetch();
    if (!$row || !(int) $row['attivo']) {
        json_error('Utente non trovato o non attivo', 403);
    }
    if (!is_admin_utente($row)) {
        json_error('Accesso riservato agli amministratori', 403);
    }
    return $row;
}

function id_utente_admin_da_richiesta(array $data, array $query = []): string
{
    return trim((string) ($data['id_utente_admin'] ?? $query['id_utente_admin'] ?? ''));
}
