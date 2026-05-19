<?php
header('Content-Type: application/json; charset=utf-8');

try {
    $pdo = new PDO(
        'mysql:host=127.0.0.1;dbname=stazione_ricarica;charset=utf8mb4',
        'root',
        ''
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $sql = "
        SELECT
            id_stazione,
            nome,
            indirizzo,
            latitudine,
            longitudine
        FROM stazioni
        WHERE latitudine IS NOT NULL
          AND longitudine IS NOT NULL
        ORDER BY nome
    ";

    $stmt = $pdo->query($sql);
    $stazioni = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($stazioni as &$row) {
        $row['latitudine'] = (float) $row['latitudine'];
        $row['longitudine'] = (float) $row['longitudine'];
    }
    unset($row);

    echo json_encode($stazioni, JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['errore' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}