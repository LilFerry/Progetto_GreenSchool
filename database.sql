-- Creazione e selezione del database
CREATE DATABASE IF NOT EXISTS `stazione_ricarica` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_general_ci;

USE `stazione_ricarica`;
-- Seed: 10 accumulatori (auto separati da bici/monopattino), punti variabili per tipo.
-- Tariffa solo in punti_ricarica.tariffa_predefinita (tabella tariffe_orarie vuota).
-- Admin senza badge; guest guest@stazionericarica.it / guest123; sessioni e storico batteria vuoti.

-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: stazione_ricarica
-- ------------------------------------------------------
-- Server version	5.5.5-10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `accumulatori_stazione`
--

DROP TABLE IF EXISTS `accumulatori_stazione`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accumulatori_stazione` (
  `id_accumulatore` char(36) NOT NULL,
  `id_stazione` char(36) NOT NULL,
  `nome` varchar(50) DEFAULT 'Accumulatore Principale',
  `capacita_totale_kwh` decimal(10,2) NOT NULL,
  `capacita_utilizzabile_kwh` decimal(10,2) NOT NULL,
  `potenza_max_carica_kw` decimal(6,2) DEFAULT NULL,
  `potenza_max_scarica_kw` decimal(6,2) DEFAULT NULL,
  `livello_corrente_kwh` decimal(10,2) DEFAULT 0.00,
  `percentuale_carica` decimal(5,2) DEFAULT 0.00,
  `stato_operativo` enum('carica','scarica','standby','guasto','manutenzione') DEFAULT 'standby',
  `data_ultimo_aggiornamento` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `soglia_minima_perc` decimal(5,2) DEFAULT 20.00,
  `soglia_massima_perc` decimal(5,2) DEFAULT 90.00,
  PRIMARY KEY (`id_accumulatore`),
  KEY `idx_accumulatore_stazione` (`id_stazione`),
  KEY `idx_accumulatore_livello` (`percentuale_carica`),
  CONSTRAINT `accumulatori_stazione_ibfk_1` FOREIGN KEY (`id_stazione`) REFERENCES `stazioni` (`id_stazione`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accumulatori_stazione`
--

LOCK TABLES `accumulatori_stazione` WRITE;
/*!40000 ALTER TABLE `accumulatori_stazione` DISABLE KEYS */;
INSERT INTO `accumulatori_stazione` VALUES ('acc00000-0000-4000-8000-000000000001','26936b4e-4ddf-11f1-b6f1-1063386df78e','Accumulatore Auto 1 - IP',80.00,72.00,50.00,40.00,60.00,83.33,'standby','2026-05-23 10:00:00',15.00,95.00),
('acc00000-0000-4000-8000-000000000002','26936b4e-4ddf-11f1-b6f1-1063386df78e','Accumulatore Auto 2 - IP',80.00,72.00,50.00,40.00,60.00,83.33,'standby','2026-05-23 10:00:00',15.00,95.00),
('acc00000-0000-4000-8000-000000000003','26936b4e-4ddf-11f1-b6f1-1063386df78e','Accumulatore Bici/Mono - IP',80.00,72.00,50.00,40.00,60.00,83.33,'standby','2026-05-23 10:00:00',15.00,95.00),
('acc00000-0000-4000-8000-000000000004','26936b4f-4ddf-11f1-b6f1-1063386df78e','Accumulatore Bici/Mono - EST',80.00,72.00,50.00,40.00,60.00,83.33,'standby','2026-05-23 10:00:00',15.00,95.00),
('acc00000-0000-4000-8000-000000000005','26936b50-4ddf-11f1-b6f1-1063386df78e','Accumulatore Auto 1 - OVE',80.00,72.00,50.00,40.00,60.00,83.33,'standby','2026-05-23 10:00:00',15.00,95.00),
('acc00000-0000-4000-8000-000000000006','26936b51-4ddf-11f1-b6f1-1063386df78e','Accumulatore Auto 1 - AVE',80.00,72.00,50.00,40.00,60.00,83.33,'standby','2026-05-23 10:00:00',15.00,95.00),
('acc00000-0000-4000-8000-000000000007','26936b51-4ddf-11f1-b6f1-1063386df78e','Accumulatore Auto 2 - AVE',80.00,72.00,50.00,40.00,60.00,83.33,'standby','2026-05-23 10:00:00',15.00,95.00),
('acc00000-0000-4000-8000-000000000008','26936b51-4ddf-11f1-b6f1-1063386df78e','Accumulatore Bici/Mono - AVE',80.00,72.00,50.00,40.00,60.00,83.33,'standby','2026-05-23 10:00:00',15.00,95.00),
('acc00000-0000-4000-8000-000000000009','26936b52-4ddf-11f1-b6f1-1063386df78e','Accumulatore Auto 1 - GIA',80.00,72.00,50.00,40.00,60.00,83.33,'standby','2026-05-23 10:00:00',15.00,95.00),
('acc00000-0000-4000-8000-000000000010','26936b52-4ddf-11f1-b6f1-1063386df78e','Accumulatore Bici/Mono - GIA',80.00,72.00,50.00,40.00,60.00,83.33,'standby','2026-05-23 10:00:00',15.00,95.00);
/*!40000 ALTER TABLE `accumulatori_stazione` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `badge_utente`
--

DROP TABLE IF EXISTS `badge_utente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `badge_utente` (
  `id_badge` int(11) NOT NULL AUTO_INCREMENT,
  `id_utente` char(36) NOT NULL,
  `codice_rfid` varchar(100) NOT NULL,
  `nome_badge` varchar(50) DEFAULT 'Principale',
  `data_attivazione` timestamp NOT NULL DEFAULT current_timestamp(),
  `bloccato` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id_badge`),
  UNIQUE KEY `codice_rfid` (`codice_rfid`),
  KEY `idx_badge_rfid` (`codice_rfid`),
  KEY `idx_badge_utente` (`id_utente`),
  CONSTRAINT `badge_utente_ibfk_1` FOREIGN KEY (`id_utente`) REFERENCES `utenti` (`id_utente`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `badge_utente`
--

LOCK TABLES `badge_utente` WRITE;
/*!40000 ALTER TABLE `badge_utente` DISABLE KEYS */;
INSERT INTO `badge_utente` VALUES (1,'c2000000-0000-0000-0000-000000000010','RFID-GUEST-0001','Badge Ospite','2026-05-23 10:00:00',0);
/*!40000 ALTER TABLE `badge_utente` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `punti_ricarica`
--

DROP TABLE IF EXISTS `punti_ricarica`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `punti_ricarica` (
  `id_punto` char(36) NOT NULL,
  `id_stazione` char(36) NOT NULL,
  `id_accumulatore` char(36) NOT NULL,
  `identificativo_fisico` varchar(50) DEFAULT NULL,
  `tipo_veicolo` enum('auto','bici','monopattino') NOT NULL,
  `tipo_connettore` varchar(30) DEFAULT NULL,
  `potenza_max_kw` decimal(6,2) DEFAULT NULL,
  `stato_hardware` enum('online','offline','guasto','manutenzione_programmata') DEFAULT 'online',
  `data_ultimo_heartbeat` timestamp NULL DEFAULT NULL,
  `tariffa_predefinita` decimal(6,4) DEFAULT NULL,
  `metodi_autenticazione_supportati` longtext DEFAULT NULL,
  PRIMARY KEY (`id_punto`),
  KEY `idx_punti_stazione` (`id_stazione`),
  KEY `idx_punti_accumulatore` (`id_accumulatore`,`tipo_veicolo`),
  KEY `idx_punti_heartbeat` (`data_ultimo_heartbeat`),
  KEY `idx_punti_hardware` (`stato_hardware`),
  CONSTRAINT `punti_ricarica_ibfk_1` FOREIGN KEY (`id_stazione`) REFERENCES `stazioni` (`id_stazione`) ON DELETE CASCADE,
  CONSTRAINT `punti_ricarica_ibfk_2` FOREIGN KEY (`id_accumulatore`) REFERENCES `accumulatori_stazione` (`id_accumulatore`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `punti_ricarica`
--

LOCK TABLES `punti_ricarica` WRITE;
/*!40000 ALTER TABLE `punti_ricarica` DISABLE KEYS */;
INSERT INTO `punti_ricarica` VALUES ('punto000-0000-4000-8000-000000000001','26936b4e-4ddf-11f1-b6f1-1063386df78e','acc00000-0000-4000-8000-000000000001','IP-AU1-A1','auto','CCS2',22.00,'online','2026-05-23 10:00:00',0.4800,'APP,RFID,QR'),
('punto000-0000-4000-8000-000000000002','26936b4e-4ddf-11f1-b6f1-1063386df78e','acc00000-0000-4000-8000-000000000001','IP-AU1-A2','auto','CCS2',22.00,'online','2026-05-23 10:00:00',0.4800,'APP,RFID,QR'),
('punto000-0000-4000-8000-000000000003','26936b4e-4ddf-11f1-b6f1-1063386df78e','acc00000-0000-4000-8000-000000000002','IP-AU2-A1','auto','CCS2',22.00,'online','2026-05-23 10:00:00',0.4800,'APP,RFID,QR'),
('punto000-0000-4000-8000-000000000004','26936b4e-4ddf-11f1-b6f1-1063386df78e','acc00000-0000-4000-8000-000000000002','IP-AU2-A2','auto','CCS2',22.00,'online','2026-05-23 10:00:00',0.4800,'APP,RFID,QR'),
('punto000-0000-4000-8000-000000000005','26936b4e-4ddf-11f1-b6f1-1063386df78e','acc00000-0000-4000-8000-000000000003','IP-BM3-B1','bici','USB-C',3.50,'online','2026-05-23 10:00:00',0.2800,'APP,RFID,QR'),
('punto000-0000-4000-8000-000000000006','26936b4e-4ddf-11f1-b6f1-1063386df78e','acc00000-0000-4000-8000-000000000003','IP-BM3-B2','bici','USB-C',3.50,'online','2026-05-23 10:00:00',0.2800,'APP,RFID,QR'),
('punto000-0000-4000-8000-000000000007','26936b4e-4ddf-11f1-b6f1-1063386df78e','acc00000-0000-4000-8000-000000000003','IP-BM3-C1','monopattino','USB-C',2.50,'online','2026-05-23 10:00:00',0.3200,'APP,RFID,QR'),
('punto000-0000-4000-8000-000000000008','26936b4f-4ddf-11f1-b6f1-1063386df78e','acc00000-0000-4000-8000-000000000004','EST-BM4-B1','bici','USB-C',3.50,'online','2026-05-23 10:00:00',0.3000,'APP,RFID,QR'),
('punto000-0000-4000-8000-000000000009','26936b4f-4ddf-11f1-b6f1-1063386df78e','acc00000-0000-4000-8000-000000000004','EST-BM4-B2','bici','USB-C',3.50,'online','2026-05-23 10:00:00',0.3000,'APP,RFID,QR'),
('punto000-0000-4000-8000-000000000010','26936b4f-4ddf-11f1-b6f1-1063386df78e','acc00000-0000-4000-8000-000000000004','EST-BM4-C1','monopattino','USB-C',2.50,'online','2026-05-23 10:00:00',0.3400,'APP,RFID,QR'),
('punto000-0000-4000-8000-000000000011','26936b4f-4ddf-11f1-b6f1-1063386df78e','acc00000-0000-4000-8000-000000000004','EST-BM4-C2','monopattino','USB-C',2.50,'online','2026-05-23 10:00:00',0.3400,'APP,RFID,QR'),
('punto000-0000-4000-8000-000000000012','26936b50-4ddf-11f1-b6f1-1063386df78e','acc00000-0000-4000-8000-000000000005','OVE-AU1-A1','auto','CCS2',22.00,'online','2026-05-23 10:00:00',0.4900,'APP,RFID,QR'),
('punto000-0000-4000-8000-000000000013','26936b50-4ddf-11f1-b6f1-1063386df78e','acc00000-0000-4000-8000-000000000005','OVE-AU1-A2','auto','CCS2',22.00,'online','2026-05-23 10:00:00',0.4900,'APP,RFID,QR'),
('punto000-0000-4000-8000-000000000014','26936b50-4ddf-11f1-b6f1-1063386df78e','acc00000-0000-4000-8000-000000000005','OVE-AU1-A3','auto','CCS2',22.00,'online','2026-05-23 10:00:00',0.4900,'APP,RFID,QR'),
('punto000-0000-4000-8000-000000000015','26936b51-4ddf-11f1-b6f1-1063386df78e','acc00000-0000-4000-8000-000000000006','AVE-AU1-A1','auto','CCS2',22.00,'online','2026-05-23 10:00:00',0.5100,'APP,RFID,QR'),
('punto000-0000-4000-8000-000000000016','26936b51-4ddf-11f1-b6f1-1063386df78e','acc00000-0000-4000-8000-000000000006','AVE-AU1-A2','auto','CCS2',22.00,'online','2026-05-23 10:00:00',0.5100,'APP,RFID,QR'),
('punto000-0000-4000-8000-000000000017','26936b51-4ddf-11f1-b6f1-1063386df78e','acc00000-0000-4000-8000-000000000007','AVE-AU2-A1','auto','CCS2',22.00,'online','2026-05-23 10:00:00',0.5100,'APP,RFID,QR'),
('punto000-0000-4000-8000-000000000018','26936b51-4ddf-11f1-b6f1-1063386df78e','acc00000-0000-4000-8000-000000000008','AVE-BM8-B1','bici','USB-C',3.50,'online','2026-05-23 10:00:00',0.3100,'APP,RFID,QR'),
('punto000-0000-4000-8000-000000000019','26936b51-4ddf-11f1-b6f1-1063386df78e','acc00000-0000-4000-8000-000000000008','AVE-BM8-B2','bici','USB-C',3.50,'online','2026-05-23 10:00:00',0.3100,'APP,RFID,QR'),
('punto000-0000-4000-8000-000000000020','26936b51-4ddf-11f1-b6f1-1063386df78e','acc00000-0000-4000-8000-000000000008','AVE-BM8-C1','monopattino','USB-C',2.50,'online','2026-05-23 10:00:00',0.3500,'APP,RFID,QR'),
('punto000-0000-4000-8000-000000000021','26936b51-4ddf-11f1-b6f1-1063386df78e','acc00000-0000-4000-8000-000000000008','AVE-BM8-C2','monopattino','USB-C',2.50,'online','2026-05-23 10:00:00',0.3500,'APP,RFID,QR'),
('punto000-0000-4000-8000-000000000022','26936b52-4ddf-11f1-b6f1-1063386df78e','acc00000-0000-4000-8000-000000000009','GIA-AU1-A1','auto','CCS2',22.00,'online','2026-05-23 10:00:00',0.4900,'APP,RFID,QR'),
('punto000-0000-4000-8000-000000000023','26936b52-4ddf-11f1-b6f1-1063386df78e','acc00000-0000-4000-8000-000000000009','GIA-AU1-A2','auto','CCS2',22.00,'online','2026-05-23 10:00:00',0.4900,'APP,RFID,QR'),
('punto000-0000-4000-8000-000000000024','26936b52-4ddf-11f1-b6f1-1063386df78e','acc00000-0000-4000-8000-000000000010','GIA-BM10-B1','bici','USB-C',3.50,'online','2026-05-23 10:00:00',0.2900,'APP,RFID,QR'),
('punto000-0000-4000-8000-000000000025','26936b52-4ddf-11f1-b6f1-1063386df78e','acc00000-0000-4000-8000-000000000010','GIA-BM10-C1','monopattino','USB-C',2.50,'online','2026-05-23 10:00:00',0.3300,'APP,RFID,QR');
/*!40000 ALTER TABLE `punti_ricarica` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessioni_ricarica`
--

DROP TABLE IF EXISTS `sessioni_ricarica`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessioni_ricarica` (
  `id_sessione` char(36) NOT NULL,
  `id_utente` char(36) DEFAULT NULL,
  `id_punto` char(36) NOT NULL,
  `id_badge_usato` int(11) DEFAULT NULL,
  `metodo_avvio` enum('APP','RFID','QR_CODE','ADMIN') NOT NULL,
  `data_inizio` timestamp NOT NULL DEFAULT current_timestamp(),
  `data_fine` timestamp NULL DEFAULT NULL,
  `quantita_kwh` decimal(10,3) DEFAULT NULL,
  `tipo_tariffa_applicata` enum('standard','gratuita_promozione','gratuita_abbonamento','gratuita_struttura','forfettaria') DEFAULT 'standard',
  `costo_totale` decimal(10,2) DEFAULT 0.00,
  `motivazione_gratuita` text DEFAULT NULL,
  `stato_pagamento` enum('non_richiesto','in_attesa_pagamento','completato','fallito','gratuito') DEFAULT 'non_richiesto',
  `id_transazione_pagamento` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id_sessione`),
  KEY `idx_sessioni_aperte` (`id_punto`,`data_fine`),
  KEY `idx_sessioni_utente` (`id_utente`,`data_inizio`),
  KEY `idx_sessioni_periodo` (`data_inizio`,`data_fine`),
  KEY `idx_sessioni_badge` (`id_badge_usato`),
  CONSTRAINT `sessioni_ricarica_ibfk_1` FOREIGN KEY (`id_utente`) REFERENCES `utenti` (`id_utente`) ON DELETE CASCADE,
  CONSTRAINT `sessioni_ricarica_ibfk_2` FOREIGN KEY (`id_punto`) REFERENCES `punti_ricarica` (`id_punto`) ON DELETE CASCADE,
  CONSTRAINT `sessioni_ricarica_ibfk_3` FOREIGN KEY (`id_badge_usato`) REFERENCES `badge_utente` (`id_badge`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessioni_ricarica`
--

LOCK TABLES `sessioni_ricarica` WRITE;
/*!40000 ALTER TABLE `sessioni_ricarica` DISABLE KEYS */;
/*!40000 ALTER TABLE `sessioni_ricarica` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stazioni`
--

DROP TABLE IF EXISTS `stazioni`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stazioni` (
  `id_stazione` char(36) NOT NULL,
  `nome` varchar(100) NOT NULL,
  `indirizzo` text DEFAULT NULL,
  `latitudine` decimal(10,8) NOT NULL,
  `longitudine` decimal(11,8) NOT NULL,
  `coordinata` point NOT NULL,
  `tipo_area` enum('pubblico','privato','aziendale') DEFAULT 'pubblico',
  `data_attivazione` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_stazione`),
  KEY `idx_stazioni_coordinate` (`latitudine`,`longitudine`),
  SPATIAL KEY `idx_stazioni_geo` (`coordinata`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stazioni`
--

LOCK TABLES `stazioni` WRITE;
/*!40000 ALTER TABLE `stazioni` DISABLE KEYS */;
INSERT INTO `stazioni` VALUES ('26936b4e-4ddf-11f1-b6f1-1063386df78e','Stazione Ricarica Ingresso Principale','Via dei Carpani 19B Castelfranco Veneto',45.68141100,11.93797800,_binary '\0\0\0\0\0\0\0\'��>\�\'@<\�y8\�F@','pubblico','2026-05-18 10:00:00'),('26936b4f-4ddf-11f1-b6f1-1063386df78e','Stazione Ricarica Parcheggio Est','Via dei Carpani 19B Castelfranco Veneto',45.68155300,11.93815400,_binary '\0\0\0\0\0\0\0\"9?�U\�\'@ݾ� =\�F@','pubblico','2026-05-18 10:00:00'),('26936b50-4ddf-11f1-b6f1-1063386df78e','Stazione Ricarica Parcheggio Ovest','Via dei Carpani 19B Castelfranco Veneto',45.68127600,11.93780200,_binary '\0\0\0\0\0\0\0-?p?\'\�\'@\\\�M\r4\�F@','pubblico','2026-05-12 08:47:04'),('26936b51-4ddf-11f1-b6f1-1063386df78e','Stazione Ricarica Via Avenale','Via Avenale 6 Castelfranco Veneto',45.67984500,11.92488600,_binary '\0\0\0\0\0\0\0xe�?\�\'@��4)\�F@','pubblico','2026-05-18 08:05:00'),('26936b52-4ddf-11f1-b6f1-1063386df78e','Stazione Ricarica Giardini','Via dei Carpani 19B Castelfranco Veneto',45.68148900,11.93785600,_binary '\0\0\0\0\0\0\0��`�.\�\'@�\�;\�F@','pubblico','2026-05-18 08:10:10');
/*!40000 ALTER TABLE `stazioni` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `storico_livello_batteria`
--

DROP TABLE IF EXISTS `storico_livello_batteria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `storico_livello_batteria` (
  `id_misurazione` bigint(20) NOT NULL AUTO_INCREMENT,
  `id_accumulatore` char(36) NOT NULL,
  `timestamp_misurazione` timestamp NOT NULL DEFAULT current_timestamp(),
  `livello_kwh` decimal(10,2) NOT NULL,
  `potenza_istantanea_kw` decimal(7,2) DEFAULT NULL,
  `temperatura_celsius` decimal(4,1) DEFAULT NULL,
  PRIMARY KEY (`id_misurazione`),
  KEY `idx_storico_batteria_tempo` (`id_accumulatore`,`timestamp_misurazione`),
  CONSTRAINT `storico_livello_batteria_ibfk_1` FOREIGN KEY (`id_accumulatore`) REFERENCES `accumulatori_stazione` (`id_accumulatore`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `storico_livello_batteria`
--

LOCK TABLES `storico_livello_batteria` WRITE;
/*!40000 ALTER TABLE `storico_livello_batteria` DISABLE KEYS */;
/*!40000 ALTER TABLE `storico_livello_batteria` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tariffe_orarie`
--

DROP TABLE IF EXISTS `tariffe_orarie`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tariffe_orarie` (
  `id_tariffa` int(11) NOT NULL AUTO_INCREMENT,
  `id_punto` char(36) NOT NULL,
  `giorno_settimana` tinyint(4) DEFAULT NULL COMMENT '0=Domenica, 6=Sabato',
  `ora_inizio` time NOT NULL,
  `ora_fine` time NOT NULL,
  `prezzo_kwh` decimal(6,4) NOT NULL,
  `data_attivazione` date NOT NULL,
  `data_scadenza` date DEFAULT NULL,
  PRIMARY KEY (`id_tariffa`),
  KEY `idx_tariffe_periodo` (`id_punto`,`giorno_settimana`,`ora_inizio`),
  CONSTRAINT `tariffe_orarie_ibfk_1` FOREIGN KEY (`id_punto`) REFERENCES `punti_ricarica` (`id_punto`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tariffe_orarie`
--

LOCK TABLES `tariffe_orarie` WRITE;
/*!40000 ALTER TABLE `tariffe_orarie` DISABLE KEYS */;
-- Nessuna tariffa oraria: si usa solo tariffa_predefinita su punti_ricarica
/*!40000 ALTER TABLE `tariffe_orarie` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `utenti`
--

DROP TABLE IF EXISTS `utenti`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `utenti` (
  `id_utente` char(36) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `cellulare` varchar(20) DEFAULT NULL,
  `nome` varchar(100) DEFAULT NULL,
  `cognome` varchar(100) DEFAULT NULL,
  `data_registrazione` timestamp NOT NULL DEFAULT current_timestamp(),
  `tipo_account` enum('completo','badge_anonimo','ospite') DEFAULT 'completo',
  `attivo` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id_utente`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_utenti_email` (`email`),
  KEY `idx_utenti_cellulare` (`cellulare`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `utenti`
--

LOCK TABLES `utenti` WRITE;
/*!40000 ALTER TABLE `utenti` DISABLE KEYS */;
INSERT INTO `utenti` VALUES ('a1000000-0000-0000-0000-000000000001','admin@stazionericarica.it',NULL,'+39 333 1000001','Marco','Amministratori','2026-01-01 07:00:00','completo',1),('c2000000-0000-0000-0000-000000000010','guest@stazionericarica.it','$2y$10$WlNiKzR31Pyd13SVp5Ex0.WaDkSD3aEd0JEmylGMBieuIriOXxLaa',NULL,NULL,NULL,'2026-05-23 10:00:00','ospite',1);
/*!40000 ALTER TABLE `utenti` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `utente_gamification`
--

DROP TABLE IF EXISTS `utente_gamification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `utente_gamification` (
  `id_utente` char(36) NOT NULL,
  `xp_totale` int unsigned NOT NULL DEFAULT 0,
  `livello` int unsigned NOT NULL DEFAULT 1,
  `ricariche_completate` int unsigned NOT NULL DEFAULT 0,
  `kwh_totali` decimal(12,3) NOT NULL DEFAULT 0.000,
  `aggiornato_il` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_utente`),
  KEY `idx_gamification_xp` (`xp_totale` DESC),
  CONSTRAINT `utente_gamification_ibfk_1` FOREIGN KEY (`id_utente`) REFERENCES `utenti` (`id_utente`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `missioni_giornaliere_progresso`
--

DROP TABLE IF EXISTS `missioni_giornaliere_progresso`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `missioni_giornaliere_progresso` (
  `id_utente` char(36) NOT NULL,
  `data_missione` date NOT NULL,
  `codice_missione` varchar(40) NOT NULL,
  `progresso` decimal(10,3) NOT NULL DEFAULT 0.000,
  `completata` tinyint(1) NOT NULL DEFAULT 0,
  `xp_bonus_riscosso` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_utente`,`data_missione`,`codice_missione`),
  CONSTRAINT `missioni_progresso_ibfk_1` FOREIGN KEY (`id_utente`) REFERENCES `utenti` (`id_utente`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `vw_report_giornaliero`
--

DROP TABLE IF EXISTS `vw_report_giornaliero`;
/*!50001 DROP VIEW IF EXISTS `vw_report_giornaliero`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_report_giornaliero` AS SELECT 
 1 AS `data`,
 1 AS `tipo_veicolo`,
 1 AS `numero_ricariche`,
 1 AS `totale_kwh`,
 1 AS `incasso_standard`,
 1 AS `kwh_gratuiti`,
 1 AS `durata_media_minuti`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_stato_colonnine`
--

DROP TABLE IF EXISTS `vw_stato_colonnine`;
/*!50001 DROP VIEW IF EXISTS `vw_stato_colonnine`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_stato_colonnine` AS SELECT 
 1 AS `id_punto`,
 1 AS `identificativo_fisico`,
 1 AS `tipo_veicolo`,
 1 AS `tipo_connettore`,
 1 AS `potenza_max_kw`,
 1 AS `tariffa_predefinita`,
 1 AS `id_stazione`,
 1 AS `nome_stazione`,
 1 AS `latitudine`,
 1 AS `longitudine`,
 1 AS `indirizzo`,
 1 AS `stato_calcolato`,
 1 AS `id_sessione`,
 1 AS `occupata_da`,
 1 AS `minuti_trascorsi`,
 1 AS `occupante_nome`,
 1 AS `occupante_cognome`,
 1 AS `batteria_stazione_perc`,
 1 AS `batteria_stazione_kwh`,
 1 AS `batteria_stato`*/;
SET character_set_client = @saved_cs_client;

--
-- Final view structure for view `vw_report_giornaliero`
--

/*!50001 DROP VIEW IF EXISTS `vw_report_giornaliero`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_report_giornaliero` AS select cast(`s`.`data_inizio` as date) AS `data`,`p`.`tipo_veicolo` AS `tipo_veicolo`,count(0) AS `numero_ricariche`,sum(`s`.`quantita_kwh`) AS `totale_kwh`,sum(case when `s`.`tipo_tariffa_applicata` = 'standard' then `s`.`costo_totale` else 0 end) AS `incasso_standard`,sum(case when `s`.`tipo_tariffa_applicata` like 'gratuita%' then `s`.`quantita_kwh` else 0 end) AS `kwh_gratuiti`,avg(timestampdiff(MINUTE,`s`.`data_inizio`,`s`.`data_fine`)) AS `durata_media_minuti` from (`sessioni_ricarica` `s` join `punti_ricarica` `p` on(`s`.`id_punto` = `p`.`id_punto`)) where `s`.`data_fine` is not null group by cast(`s`.`data_inizio` as date),`p`.`tipo_veicolo` order by cast(`s`.`data_inizio` as date) desc,`p`.`tipo_veicolo` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_stato_colonnine`
--

/*!50001 DROP VIEW IF EXISTS `vw_stato_colonnine`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_stato_colonnine` AS select `p`.`id_punto` AS `id_punto`,`p`.`identificativo_fisico` AS `identificativo_fisico`,`p`.`tipo_veicolo` AS `tipo_veicolo`,`p`.`tipo_connettore` AS `tipo_connettore`,`p`.`potenza_max_kw` AS `potenza_max_kw`,`p`.`tariffa_predefinita` AS `tariffa_predefinita`,`s`.`id_stazione` AS `id_stazione`,`s`.`nome` AS `nome_stazione`,`s`.`latitudine` AS `latitudine`,`s`.`longitudine` AS `longitudine`,`s`.`indirizzo` AS `indirizzo`,case when `p`.`stato_hardware` in ('guasto','manutenzione_programmata') then 'fuori_servizio' when `p`.`data_ultimo_heartbeat` is null then 'offline' when `p`.`data_ultimo_heartbeat` < current_timestamp() - interval 5 minute then 'offline' when `sess`.`id_sessione` is not null then 'occupata' else 'libera' end AS `stato_calcolato`,`sess`.`id_sessione` AS `id_sessione`,`sess`.`data_inizio` AS `occupata_da`,timestampdiff(MINUTE,`sess`.`data_inizio`,current_timestamp()) AS `minuti_trascorsi`,`u`.`nome` AS `occupante_nome`,`u`.`cognome` AS `occupante_cognome`,`acc`.`percentuale_carica` AS `batteria_stazione_perc`,`acc`.`livello_corrente_kwh` AS `batteria_stazione_kwh`,`acc`.`stato_operativo` AS `batteria_stato` from ((((`punti_ricarica` `p` join `stazioni` `s` on(`p`.`id_stazione` = `s`.`id_stazione`)) left join `sessioni_ricarica` `sess` on(`p`.`id_punto` = `sess`.`id_punto` and `sess`.`data_fine` is null)) left join `utenti` `u` on(`sess`.`id_utente` = `u`.`id_utente`)) left join `accumulatori_stazione` `acc` on(`s`.`id_stazione` = `acc`.`id_stazione`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-23  8:48:35
