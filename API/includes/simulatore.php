<?php
/**
 * Client HTTP verso il simulatore Python (solo hardware / tick ricarica).
 */

function simulatore_base_url(): string
{
    $url = getenv('SIMULATORE_URL');
    if ($url === false || $url === '') {
        $url = $_SERVER['SIMULATORE_URL'] ?? '';
    }
    if ($url === '') {
        $url = 'http://127.0.0.1:5050';
    }
    return rtrim($url, '/');
}

function simulatore_errore_leggibile(?string $curlErr, string $url): string
{
    $err = trim((string) $curlErr);
    if ($err === '') {
        return 'Simulatore non raggiungibile.';
    }
    if (stripos($err, 'Failed to connect') !== false || stripos($err, 'Connection refused') !== false) {
        return 'Simulatore Python non avviato o porta errata. '
            . "URL configurato: {$url}. "
            . 'Apri un terminale in cartella simulatore, esegui: python main.py '
            . '(porta 5050). Poi verifica nel browser: ' . $url . '/health';
    }
    return $err;
}

/**
 * @return array{ok:bool, http_code:int, body:array|null, error:?string}
 */
function simulatore_request(string $method, string $path, ?array $payload = null): array
{
    $url = simulatore_base_url() . $path;
    $raw = false;
    $httpCode = 0;

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        $headers = ['Content-Type: application/json', 'Accept: application/json'];
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_CUSTOMREQUEST => strtoupper($method),
        ]);
        if ($payload !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_UNESCAPED_UNICODE));
        }
        $raw = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);
        if ($raw === false) {
            return [
                'ok' => false,
                'http_code' => 0,
                'body' => null,
                'error' => simulatore_errore_leggibile($curlErr, $url),
            ];
        }
    } else {
        $opts = [
            'http' => [
                'method' => strtoupper($method),
                'header' => "Content-Type: application/json\r\nAccept: application/json\r\n",
                'timeout' => 30,
                'ignore_errors' => true,
            ],
        ];
        if ($payload !== null) {
            $opts['http']['content'] = json_encode($payload, JSON_UNESCAPED_UNICODE);
        }
        $ctx = stream_context_create($opts);
        $raw = @file_get_contents($url, false, $ctx);
        if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
            $httpCode = (int) $m[1];
        }
        if ($raw === false) {
            return [
                'ok' => false,
                'http_code' => 0,
                'body' => null,
                'error' => 'Simulatore non raggiungibile. Avviare: python simulatore/main.py',
            ];
        }
    }

    $body = json_decode($raw, true);
    if (!is_array($body)) {
        return [
            'ok' => false,
            'http_code' => $httpCode,
            'body' => null,
            'error' => 'Risposta non valida dal simulatore',
        ];
    }

    $ok = $httpCode >= 200 && $httpCode < 300 && ($body['status'] ?? '') === 'success';

    return [
        'ok' => $ok,
        'http_code' => $httpCode,
        'body' => $body,
        'error' => $ok ? null : ($body['message'] ?? 'Errore simulatore'),
    ];
}

function simulatore_avvia(string $id_sessione, ?string $id_accumulatore = null): array
{
    $payload = ['id_sessione' => $id_sessione];
    if ($id_accumulatore) {
        $payload['id_accumulatore'] = $id_accumulatore;
    }
    return simulatore_request('POST', '/simulazione/avvia', $payload);
}

function simulatore_termina(?string $id_sessione = null, ?string $id_punto = null): array
{
    $payload = [];
    if ($id_sessione) {
        $payload['id_sessione'] = $id_sessione;
    }
    if ($id_punto) {
        $payload['id_punto'] = $id_punto;
    }

    $url = simulatore_base_url() . '/sessione/termina';
    if (!function_exists('curl_init')) {
        return simulatore_request('POST', '/sessione/termina', $payload);
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 90,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
        CURLOPT_CUSTOMREQUEST => 'POST',
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
    ]);
    $raw = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($raw === false) {
        return [
            'ok' => false,
            'http_code' => 0,
            'body' => null,
            'error' => simulatore_errore_leggibile('Failed to connect', $url),
        ];
    }
    $body = json_decode($raw, true);
    if (!is_array($body)) {
        return ['ok' => false, 'http_code' => $httpCode, 'body' => null, 'error' => 'Risposta non valida'];
    }
    $ok = $httpCode >= 200 && $httpCode < 300 && ($body['status'] ?? '') === 'success';
    return [
        'ok' => $ok,
        'http_code' => $httpCode,
        'body' => $body,
        'error' => $ok ? null : ($body['message'] ?? 'Errore simulatore'),
    ];
}

function simulatore_stato(string $id_sessione): array
{
    return simulatore_request('GET', '/sessione/' . rawurlencode($id_sessione));
}
