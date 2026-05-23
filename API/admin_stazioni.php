<?php
// GET: elenco stazioni | POST: crea/aggiorna | DELETE via POST action=elimina

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/admin_helpers.php';
require_once __DIR__ . '/includes/colonnina_helpers.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = $method === 'GET' ? $_GET : read_json_body();
$idAdmin = id_utente_admin_da_richiesta($data, $_GET);

try {
    $pdo = db_connect();
    richiedi_admin($pdo, $idAdmin);

    if ($method === 'GET') {
        $stmt = $pdo->query(
            "SELECT s.id_stazione, s.nome, s.indirizzo, s.latitudine, s.longitudine, s.tipo_area,
                    COUNT(DISTINCT p.id_punto) AS num_colonnine,
                    SUM(CASE WHEN sess.id_sessione IS NOT NULL THEN 1 ELSE 0 END) AS colonnine_occupate
             FROM stazioni s
             LEFT JOIN punti_ricarica p ON p.id_stazione = s.id_stazione
             LEFT JOIN sessioni_ricarica sess ON sess.id_punto = p.id_punto AND sess.data_fine IS NULL
             GROUP BY s.id_stazione, s.nome, s.indirizzo, s.latitudine, s.longitudine, s.tipo_area
             ORDER BY s.nome"
        );
        $lista = [];
        while ($r = $stmt->fetch()) {
            $lista[] = [
                'id_stazione' => $r['id_stazione'],
                'nome' => $r['nome'],
                'indirizzo' => $r['indirizzo'],
                'latitudine' => (float) $r['latitudine'],
                'longitudine' => (float) $r['longitudine'],
                'tipo_area' => $r['tipo_area'],
                'num_colonnine' => (int) $r['num_colonnine'],
                'colonnine_occupate' => (int) $r['colonnine_occupate'],
            ];
        }
        json_response(['status' => 'success', 'data' => $lista]);
    }

    if ($method !== 'POST') {
        json_error('Metodo non consentito', 405);
    }

    $azione = strtolower(trim((string) ($data['azione'] ?? 'salva')));

    if ($azione === 'elimina') {
        $idStazione = trim((string) ($data['id_stazione'] ?? ''));
        if ($idStazione === '') {
            json_error('id_stazione obbligatorio', 400);
        }

        $pdo->beginTransaction();
        $stmt = $pdo->prepare(
            "SELECT COUNT(*) AS n FROM sessioni_ricarica s
             JOIN punti_ricarica p ON p.id_punto = s.id_punto
             WHERE p.id_stazione = :id AND s.data_fine IS NULL FOR UPDATE"
        );
        $stmt->execute(['id' => $idStazione]);
        if ((int) $stmt->fetch()['n'] > 0) {
            $pdo->rollBack();
            json_error('Impossibile eliminare: sessioni di ricarica ancora attive', 409);
        }

        $pdo->prepare('DELETE FROM stazioni WHERE id_stazione = :id')->execute(['id' => $idStazione]);
        $pdo->commit();

        json_response(['status' => 'success', 'message' => 'Stazione eliminata']);
    }

    $idStazione = trim((string) ($data['id_stazione'] ?? ''));
    $nome = trim((string) ($data['nome'] ?? ''));
    $indirizzo = trim((string) ($data['indirizzo'] ?? ''));
    $lat = isset($data['latitudine']) ? (float) $data['latitudine'] : null;
    $lng = isset($data['longitudine']) ? (float) $data['longitudine'] : null;
    $tipoArea = trim((string) ($data['tipo_area'] ?? 'pubblico'));

    if ($nome === '' || $lat === null || $lng === null) {
        json_error('nome, latitudine e longitudine obbligatori', 400);
    }
    if (!in_array($tipoArea, ['pubblico', 'privato', 'aziendale'], true)) {
        json_error('tipo_area non valido', 400);
    }

    if ($idStazione === '') {
        $idStazione = nuovo_uuid_entita();
        $stmt = $pdo->prepare(
            "INSERT INTO stazioni (id_stazione, nome, indirizzo, latitudine, longitudine, coordinata, tipo_area)
             VALUES (:id, :nome, :ind, :lat, :lng, ST_GeomFromText(CONCAT('POINT(', :lng2, ' ', :lat2, ')')), :tipo)"
        );
        $stmt->execute([
            'id' => $idStazione,
            'nome' => $nome,
            'ind' => $indirizzo ?: null,
            'lat' => $lat,
            'lng' => $lng,
            'lng2' => $lng,
            'lat2' => $lat,
            'tipo' => $tipoArea,
        ]);
        $msg = 'Stazione creata';
    } else {
        $stmt = $pdo->prepare(
            "UPDATE stazioni SET nome = :nome, indirizzo = :ind, latitudine = :lat, longitudine = :lng,
             coordinata = ST_GeomFromText(CONCAT('POINT(', :lng2, ' ', :lat2, ')')), tipo_area = :tipo
             WHERE id_stazione = :id"
        );
        $stmt->execute([
            'id' => $idStazione,
            'nome' => $nome,
            'ind' => $indirizzo ?: null,
            'lat' => $lat,
            'lng' => $lng,
            'lng2' => $lng,
            'lat2' => $lat,
            'tipo' => $tipoArea,
        ]);
        $msg = 'Stazione aggiornata';
    }

    json_response([
        'status' => 'success',
        'message' => $msg,
        'data' => ['id_stazione' => $idStazione],
    ], $msg === 'Stazione creata' ? 201 : 200);

} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_error('Errore admin stazioni: ' . $e->getMessage(), 500);
}
