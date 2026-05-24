<?php
/**
 * scuola_consumi.php
 * 
 * Endpoint che fornisce i dati aggregati dei consumi energetici della scuola
 * Calcola i consumi a partire dalle sessioni di ricarica degli utenti
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

try {
  // Connessione al database
  $db       = "stazione_ricarica";
  $host     = "127.0.0.1";
  $username = "root";
  $password = "";
  $conn     = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $username, $password);
  $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  
  // Query per ottenere i consumi aggregati degli ultimi 30 giorni
  $sql = "
    SELECT 
      DATE(sr.data_inizio) as data,
      COUNT(DISTINCT sr.id_sessione) as numero_ricariche,
      COUNT(DISTINCT sr.id_utente) as numero_utenti,
      COALESCE(SUM(sr.quantita_kwh), 0) as kwh_totali
    FROM sessioni_ricarica sr
    WHERE sr.data_inizio >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      AND sr.data_inizio IS NOT NULL
    GROUP BY DATE(sr.data_inizio)
    ORDER BY sr.data_inizio DESC
  ";
  
  $stmt = $conn->prepare($sql);
  $stmt->execute();
  $consumi = $stmt->fetchAll(PDO::FETCH_ASSOC);
  
  // Query per i totali complessivi
  $sqlTotali = "
    SELECT 
      COUNT(DISTINCT sr.id_sessione) as numero_ricariche,
      COUNT(DISTINCT sr.id_utente) as numero_utenti,
      COALESCE(SUM(sr.quantita_kwh), 0) as totale_kwh
    FROM sessioni_ricarica sr
    WHERE sr.data_inizio IS NOT NULL
  ";
  
  $stmtTotali = $conn->prepare($sqlTotali);
  $stmtTotali->execute();
  $totali = $stmtTotali->fetch(PDO::FETCH_ASSOC);
  
  // Formatta i dati
  $consumi_formattati = [];
  foreach ($consumi as $c) {
    $consumi_formattati[] = [
      'data' => $c['data'],
      'kwh_totali' => (float)$c['kwh_totali'],
      'numero_ricariche' => (int)$c['numero_ricariche'],
      'numero_utenti' => (int)$c['numero_utenti']
    ];
  }
  
  $risposta = [
    'status' => 'success',
    'data' => [
      'consumi' => $consumi_formattati,
      'totale_kwh' => (float)($totali['totale_kwh'] ?? 0),
      'numero_ricariche' => (int)($totali['numero_ricariche'] ?? 0),
      'numero_veicoli' => (int)($totali['numero_utenti'] ?? 0)
    ]
  ];
  
  echo json_encode($risposta, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
  
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode([
    'status' => 'error',
    'message' => 'Errore nel caricamento dei dati (Database)',
    'dettaglio' => 'PDOException: ' . $e->getMessage()
  ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode([
    'status' => 'error',
    'message' => 'Errore nel caricamento dei dati',
    'dettaglio' => $e->getMessage()
  ], JSON_UNESCAPED_UNICODE);
}
?>