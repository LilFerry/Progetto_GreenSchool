<?php
// GET ?limite=50&id_utente=... (opzionale, per evidenziare la propria posizione)

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

$limite = isset($_GET['limite']) ? (int) $_GET['limite'] : 50;
$idUtente = trim((string) ($_GET['id_utente'] ?? ''));

try {
    $pdo = db_connect();

    if (!gamification_tabelle_presenti($pdo)) {
        json_error(
            'Gamification non installata. Esegui database/gamification_migration.sql sul database.',
            503
        );
    }

    $classifica = classifica_utenti($pdo, $limite);
    $miaPosizione = null;

    if ($idUtente !== '') {
        foreach ($classifica as $row) {
            if ($row['id_utente'] === $idUtente) {
                $miaPosizione = $row;
                break;
            }
        }
        if ($miaPosizione === null) {
            $stmt = $pdo->prepare(
                'SELECT g.xp_totale FROM utente_gamification g WHERE g.id_utente = :id'
            );
            $stmt->execute(['id' => $idUtente]);
            $xpMio = $stmt->fetch();
            if ($xpMio) {
                $stmt = $pdo->prepare(
                    'SELECT COUNT(*) + 1 AS pos FROM utente_gamification
                     WHERE xp_totale > :xp AND id_utente != :admin'
                );
                $stmt->execute([
                    'xp' => (int) $xpMio['xp_totale'],
                    'admin' => ADMIN_UTENTE_ID,
                ]);
                $pos = (int) ($stmt->fetch()['pos'] ?? 0);
                $profilo = get_or_create_profilo_gamification($pdo, $idUtente);
                $stmtU = $pdo->prepare('SELECT nome, cognome, email FROM utenti WHERE id_utente = :id');
                $stmtU->execute(['id' => $idUtente]);
                $u = $stmtU->fetch();
                $nome = trim(($u['nome'] ?? '') . ' ' . ($u['cognome'] ?? ''));
                if ($nome === '') {
                    $nome = explode('@', (string) ($u['email'] ?? 'Tu'))[0];
                }
                $miaPosizione = [
                    'posizione' => $pos,
                    'id_utente' => $idUtente,
                    'nome_visualizzato' => $nome,
                    'xp_totale' => (int) $profilo['xp_totale'],
                    'livello' => (int) $profilo['livello'],
                    'ricariche_completate' => (int) $profilo['ricariche_completate'],
                    'kwh_totali' => round((float) $profilo['kwh_totali'], 2),
                    'fuori_top' => true,
                ];
            }
        }
    }

    json_response([
        'status' => 'success',
        'data' => [
            'classifica' => $classifica,
            'mia_posizione' => $miaPosizione,
        ],
    ]);
} catch (Throwable $e) {
    json_error('Errore classifica: ' . $e->getMessage(), 500);
}
