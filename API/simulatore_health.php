<?php
// GET — verifica se il simulatore Python risponde (utile per debug)

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/includes/simulatore.php';

$url = simulatore_base_url() . '/health';
$raw = false;
$err = null;

if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 5,
        CURLOPT_CONNECTTIMEOUT => 3,
    ]);
    $raw = curl_exec($ch);
    $err = curl_error($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
} else {
    $code = 0;
    $raw = @file_get_contents($url);
    if ($raw === false) {
        $err = 'Connessione fallita';
    }
}

$ok = $raw !== false && ($code === 0 || ($code >= 200 && $code < 300));

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'status' => $ok ? 'success' : 'error',
    'simulatore_url' => simulatore_base_url(),
    'health_url' => $url,
    'http_code' => $code,
    'message' => $ok
        ? 'Simulatore attivo'
        : simulatore_errore_leggibile($err, simulatore_base_url()),
    'env_SIMULATORE_URL' => getenv('SIMULATORE_URL') ?: null,
], JSON_UNESCAPED_UNICODE);
