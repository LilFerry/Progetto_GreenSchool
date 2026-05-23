-- Creazione e selezione del database
CREATE DATABASE IF NOT EXISTS `stazione_ricarica` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_general_ci;

USE `stazione_ricarica`;
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
INSERT INTO `accumulatori_stazione` VALUES ('9f557ce8-52c8-11f1-bce5-1068386df78e','26936b4e-4ddf-11f1-b6f1-1063386df78e','Accumulatore Auto A1 - Ingresso Principale',100.00,92.00,50.00,40.00,74.80,81.30,'standby','2026-05-18 09:45:00',15.00,95.00),('9f55b2a9-52c8-11f1-bce5-1068386df78e','26936b4e-4ddf-11f1-b6f1-1063386df78e','Accumulatore Bici/Monopattini B1 - Ingresso Princi',20.00,18.50,10.00,8.00,12.95,70.00,'standby','2026-05-18 09:30:00',10.00,90.00),('9f55b6ee-52c8-11f1-bce5-1068386df78e','26936b4e-4ddf-11f1-b6f1-1063386df78e','Accumulatore Riserva R1 - Ingresso Principale',50.00,46.00,25.00,20.00,9.20,20.00,'standby','2026-05-18 10:00:00',15.00,95.00),('9f55bc92-52c8-11f1-bce5-1068386df78e','26936b4f-4ddf-11f1-b6f1-1063386df78e','Accumulatore Auto A1 - Parcheggio Est',80.00,74.00,44.00,35.00,66.60,90.00,'standby','2026-05-18 09:50:00',15.00,95.00),('9f55c3b9-52c8-11f1-bce5-1068386df78e','26936b4f-4ddf-11f1-b6f1-1063386df78e','Accumulatore Bici/Monopattini B1 - Parcheggio Est',15.00,13.80,7.50,6.00,3.45,25.00,'standby','2026-05-18 09:55:00',10.00,90.00),('9f55c752-52c8-11f1-bce5-1068386df78e','26936b50-4ddf-11f1-b6f1-1063386df78e','Accumulatore Auto A1 - Parcheggio Ovest',80.00,74.00,44.00,35.00,55.50,75.00,'standby','2026-05-18 08:47:04',15.00,95.00),('9f55cbf1-52c8-11f1-bce5-1068386df78e','26936b50-4ddf-11f1-b6f1-1063386df78e','Accumulatore Bici/Monopattini B1 - Parcheggio Oves',15.00,13.80,7.50,6.00,13.11,95.00,'standby','2026-05-18 08:47:04',10.00,90.00),('9f55d961-52c8-11f1-bce5-1068386df78e','26936b51-4ddf-11f1-b6f1-1063386df78e','Accumulatore Auto A1 - Via Avenale',50.00,46.00,22.00,18.00,23.00,50.00,'standby','2026-05-18 08:05:00',15.00,95.00),('9f55e213-52c8-11f1-bce5-1068386df78e','26936b51-4ddf-11f1-b6f1-1063386df78e','Accumulatore Bici/Monopattini B1 - Via Avenale',10.00,9.20,5.00,4.00,7.36,80.00,'standby','2026-05-18 08:05:00',10.00,90.00),('9f55e4d7-52c8-11f1-bce5-1068386df78e','26936b51-4ddf-11f1-b6f1-1063386df78e','Accumulatore Bici/Monopattini B2 - Via Avenale',10.00,9.20,5.00,4.00,0.92,10.00,'standby','2026-05-18 07:58:00',10.00,90.00),('9f55eaca-52c8-11f1-bce5-1068386df78e','26936b52-4ddf-11f1-b6f1-1063386df78e','Accumulatore Bici/Monopattini B1 - Giardini',12.00,11.00,6.00,5.00,8.80,80.00,'standby','2026-05-18 08:10:10',10.00,90.00),('9f55f2f5-52c8-11f1-bce5-1068386df78e','26936b52-4ddf-11f1-b6f1-1063386df78e','Accumulatore Bici/Monopattini B2 - Giardini',12.00,11.00,6.00,5.00,5.50,50.00,'standby','2026-05-18 08:10:10',10.00,90.00),('9f55f7e8-52c8-11f1-bce5-1068386df78e','26936b52-4ddf-11f1-b6f1-1063386df78e','Accumulatore Auto A1 - Giardini',40.00,37.00,20.00,15.00,37.00,100.00,'standby','2026-05-18 08:10:10',15.00,95.00);
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `badge_utente`
--

LOCK TABLES `badge_utente` WRITE;
/*!40000 ALTER TABLE `badge_utente` DISABLE KEYS */;
INSERT INTO `badge_utente` VALUES (1,'a1000000-0000-0000-0000-000000000001','RFID-ADMIN-0001','Badge Amministratore','2026-01-01 07:00:00',0),(2,'b2000000-0000-0000-0000-000000000002','QR-GUEST-0002','Badge Ospite','2026-05-01 08:00:00',0);
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
  KEY `idx_punti_heartbeat` (`data_ultimo_heartbeat`),
  KEY `idx_punti_hardware` (`stato_hardware`),
  CONSTRAINT `punti_ricarica_ibfk_1` FOREIGN KEY (`id_stazione`) REFERENCES `stazioni` (`id_stazione`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `punti_ricarica`
--

LOCK TABLES `punti_ricarica` WRITE;
/*!40000 ALTER TABLE `punti_ricarica` DISABLE KEYS */;
INSERT INTO `punti_ricarica` VALUES ('03347251-9d7b-472f-b7ed-57f6b5d806c3','26936b52-4ddf-11f1-b6f1-1063386df78e','B12','bici','USB-C',9.16,'offline','2026-05-19 06:27:09',0.3200,'QR'),('0f32fd52-9a45-4ca9-88dd-e93e92b179c3','26936b51-4ddf-11f1-b6f1-1063386df78e','C1','monopattino','USB-C',9.95,'offline','2026-05-19 06:20:57',0.8800,'RFID'),('1a839796-5bcd-4f08-91ee-d75ab3fa3370','26936b51-4ddf-11f1-b6f1-1063386df78e','A14','auto','CCS2',39.84,'offline','2026-05-19 06:14:44',0.8900,'QR'),('338ce1e3-8446-4f2f-b9dd-28d0dee437b7','26936b4e-4ddf-11f1-b6f1-1063386df78e','B3','bici','USB-C',17.58,'offline','2026-05-19 06:35:40',1.2900,'QR'),('387794cc-cb6d-4101-b56a-21f92cc703ac','26936b4f-4ddf-11f1-b6f1-1063386df78e','B4','bici','USB-C',11.68,'offline','2026-05-19 06:01:51',0.9300,'QR'),('3c7adb16-0d70-402f-ba39-949f91cd30dc','26936b52-4ddf-11f1-b6f1-1063386df78e','B11','bici','USB-C',10.29,'offline','2026-05-19 06:47:43',0.3400,'QR'),('43cb88be-3964-4995-81fe-0d5b9e906455','26936b51-4ddf-11f1-b6f1-1063386df78e','A13','auto','CCS2',36.56,'offline','2026-05-19 05:55:11',1.2900,'QR'),('46578d96-ab29-4d6d-99c1-16bf8ead4770','26936b52-4ddf-11f1-b6f1-1063386df78e','A16','auto','CCS2',39.77,'offline','2026-05-19 06:03:56',0.7800,'RFID'),('4d78fb4e-5cae-4ecd-9661-5fb12bc5f793','26936b4e-4ddf-11f1-b6f1-1063386df78e','A2','auto','CCS2',78.63,'offline','2026-05-19 06:29:15',0.3900,'RFID'),('4e2480e1-eef6-4907-a9e7-a6015022733d','26936b4e-4ddf-11f1-b6f1-1063386df78e','B2','bici','USB-C',14.80,'offline','2026-05-19 06:15:46',0.5700,'QR'),('686d210f-3eaf-4be9-9f91-a87aaa2f79b5','26936b50-4ddf-11f1-b6f1-1063386df78e','A11','auto','CCS2',76.87,'offline','2026-05-19 06:34:54',0.8900,'RFID'),('69984802-000a-4301-bf40-64546d3c0099','26936b52-4ddf-11f1-b6f1-1063386df78e','C5','monopattino','USB-C',10.36,'offline','2026-05-19 06:39:37',0.8700,'RFID'),('7243ad2d-d9a4-4086-a9f9-bdd635a869c5','26936b52-4ddf-11f1-b6f1-1063386df78e','B10','bici','USB-C',11.03,'offline','2026-05-19 06:03:59',1.4000,'RFID'),('753fdafd-49cc-4daf-aa0a-ac7d85adaae8','26936b51-4ddf-11f1-b6f1-1063386df78e','C2','monopattino','USB-C',7.54,'offline','2026-05-19 06:13:51',0.5200,'QR'),('7a3c622f-51d5-4f50-9ab4-bba0826c3c36','26936b4e-4ddf-11f1-b6f1-1063386df78e','B1','bici','USB-C',16.12,'offline','2026-05-19 06:18:18',0.3300,'QR'),('8092ac53-1f09-4890-982f-5f52b9a919d2','26936b4e-4ddf-11f1-b6f1-1063386df78e','A1','auto','CCS2',76.58,'offline','2026-05-19 06:09:00',1.1500,'QR'),('859e5135-09be-4fd2-b9e0-d68282ac3b4a','26936b4e-4ddf-11f1-b6f1-1063386df78e','A8','auto','CCS2',35.62,'offline','2026-05-19 06:48:54',0.2700,'RFID'),('87049c8f-fb43-448a-b586-576ec9a6ba2d','26936b4e-4ddf-11f1-b6f1-1063386df78e','A5','auto','CCS2',91.85,'offline','2026-05-19 06:02:07',0.6200,'RFID'),('8beca31b-3d1d-400c-b93c-0fcf7b79c3ee','26936b52-4ddf-11f1-b6f1-1063386df78e','C4','monopattino','USB-C',11.29,'offline','2026-05-19 06:26:46',1.0500,'QR'),('8f8a8891-eab8-4db8-872b-9ef692e76fe4','26936b52-4ddf-11f1-b6f1-1063386df78e','C6','monopattino','USB-C',11.00,'offline','2026-05-19 06:06:11',1.2700,'RFID'),('a070ae8f-2b47-4232-8ee2-113567ab127d','26936b4f-4ddf-11f1-b6f1-1063386df78e','B5','bici','USB-C',12.79,'offline','2026-05-19 06:53:22',0.9100,'RFID'),('a158bd56-cc7e-4ed1-9f9d-e206c8bdaa53','26936b52-4ddf-11f1-b6f1-1063386df78e','C3','monopattino','USB-C',10.33,'offline','2026-05-19 06:30:17',0.4800,'QR'),('a19fcee0-7c2f-491a-a5a7-3131176bc1c5','26936b4f-4ddf-11f1-b6f1-1063386df78e','A9','auto','CCS2',56.79,'offline','2026-05-19 06:44:14',0.9500,'QR'),('b3e9f894-8383-4d79-8d8c-25f2549c8f97','26936b52-4ddf-11f1-b6f1-1063386df78e','B8','bici','USB-C',11.74,'offline','2026-05-19 06:37:32',0.3000,'RFID'),('bf8a2b2b-82b1-48f5-a837-978837259fdf','26936b51-4ddf-11f1-b6f1-1063386df78e','A12','auto','CCS2',35.15,'offline','2026-05-19 06:05:14',0.8100,'RFID'),('d2d71e4c-b1e1-4e11-babd-6fbb5b89281a','26936b4e-4ddf-11f1-b6f1-1063386df78e','A6','auto','CCS2',37.96,'offline','2026-05-19 06:33:41',1.0800,'RFID'),('d4535096-44a3-4f46-b42c-d1f10677edf4','26936b50-4ddf-11f1-b6f1-1063386df78e','A10','auto','CCS2',74.16,'offline','2026-05-19 06:25:50',0.9100,'QR'),('d6d4592c-58b0-4f71-8a64-55a390f11000','26936b52-4ddf-11f1-b6f1-1063386df78e','A15','auto','CCS2',29.36,'offline','2026-05-19 06:08:40',1.0800,'QR'),('d8e5af5e-ec3d-4816-aeca-aecfce0e5c0c','26936b52-4ddf-11f1-b6f1-1063386df78e','A19','auto','CCS2',37.44,'offline','2026-05-19 06:45:35',0.7900,'RFID'),('dd46f44c-bc9c-41e1-907c-23abd0f6afd8','26936b52-4ddf-11f1-b6f1-1063386df78e','B9','bici','USB-C',8.76,'offline','2026-05-19 06:07:18',0.7700,'RFID'),('df6e1d85-fbf5-4819-8a35-fe9ba23258aa','26936b52-4ddf-11f1-b6f1-1063386df78e','A18','auto','CCS2',36.83,'offline','2026-05-19 06:34:53',1.4000,'RFID'),('e12b8033-aa47-4eff-8b0e-c1452f7496ac','26936b4e-4ddf-11f1-b6f1-1063386df78e','A4','auto','CCS2',94.48,'offline','2026-05-19 06:35:32',0.5200,'QR'),('e17f7bf6-e580-4cd9-b5e6-ccbcd8ca3cbe','26936b50-4ddf-11f1-b6f1-1063386df78e','B6','bici','USB-C',11.33,'offline','2026-05-19 06:05:12',0.3600,'QR'),('e60a05c5-e6d0-45cd-a76b-00a8750d50bf','26936b52-4ddf-11f1-b6f1-1063386df78e','A17','auto','CCS2',33.59,'offline','2026-05-19 06:38:11',0.8800,'QR'),('e61c0aa0-3906-4259-a3e6-b22674c9f769','26936b4e-4ddf-11f1-b6f1-1063386df78e','A3','auto','CCS2',87.05,'offline','2026-05-19 06:08:00',0.4300,'QR'),('efc66489-193a-407a-bc52-54746a4aa0f6','26936b4e-4ddf-11f1-b6f1-1063386df78e','A7','auto','CCS2',36.92,'offline','2026-05-19 06:30:10',1.2200,'RFID'),('f62753f5-6e2b-4e8b-922c-672ca6bc84dd','26936b51-4ddf-11f1-b6f1-1063386df78e','B7','bici','USB-C',7.67,'offline','2026-05-19 06:38:23',1.2100,'RFID');
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
  CONSTRAINT `sessioni_ricarica_ibfk_1` FOREIGN KEY (`id_utente`) REFERENCES `utenti` (`id_utente`) ON DELETE SET NULL,
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
INSERT INTO `stazioni` VALUES ('26936b4e-4ddf-11f1-b6f1-1063386df78e','Stazione Ricarica Ingresso Principale','Via dei Carpani 19B Castelfranco Veneto',45.68141100,11.93797800,_binary '\0\0\0\0\0\0\0\'¼§>\à\'@<\Äy8\×F@','pubblico','2026-05-18 10:00:00'),('26936b4f-4ddf-11f1-b6f1-1063386df78e','Stazione Ricarica Parcheggio Est','Via dei Carpani 19B Castelfranco Veneto',45.68155300,11.93815400,_binary '\0\0\0\0\0\0\0\"9¸U\à\'@Ï¾ò =\×F@','pubblico','2026-05-18 10:00:00'),('26936b50-4ddf-11f1-b6f1-1063386df78e','Stazione Ricarica Parcheggio Ovest','Via dei Carpani 19B Castelfranco Veneto',45.68127600,11.93780200,_binary '\0\0\0\0\0\0\0-?p\'\à\'@\\\ÆM\r4\×F@','pubblico','2026-05-12 08:47:04'),('26936b51-4ddf-11f1-b6f1-1063386df78e','Stazione Ricarica Via Avenale','Via Avenale 6 Castelfranco Veneto',45.67984500,11.92488600,_binary '\0\0\0\0\0\0\0xe¨\Ù\'@°¬4)\×F@','pubblico','2026-05-18 08:05:00'),('26936b52-4ddf-11f1-b6f1-1063386df78e','Stazione Ricarica Giardini','Via dei Carpani 19B Castelfranco Veneto',45.68148900,11.93785600,_binary '\0\0\0\0\0\0\0ú¶`©.\à\'@¸\Ê;\×F@','pubblico','2026-05-18 08:10:10');
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
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tariffe_orarie`
--

LOCK TABLES `tariffe_orarie` WRITE;
/*!40000 ALTER TABLE `tariffe_orarie` DISABLE KEYS */;
INSERT INTO `tariffe_orarie` VALUES (1,'8092ac53-1f09-4890-982f-5f52b9a919d2',NULL,'06:00:00','12:00:00',0.4500,'2026-01-01',NULL),(2,'8092ac53-1f09-4890-982f-5f52b9a919d2',NULL,'12:00:00','20:00:00',0.5500,'2026-01-01',NULL),(3,'8092ac53-1f09-4890-982f-5f52b9a919d2',NULL,'20:00:00','06:00:00',0.3200,'2026-01-01',NULL),(4,'7a3c622f-51d5-4f50-9ab4-bba0826c3c36',NULL,'00:00:00','23:59:00',0.2500,'2026-01-01',NULL),(5,'a19fcee0-7c2f-491a-a5a7-3131176bc1c5',NULL,'07:00:00','22:00:00',0.4800,'2026-01-01',NULL),(6,'a19fcee0-7c2f-491a-a5a7-3131176bc1c5',6,'07:00:00','22:00:00',0.5400,'2026-01-01',NULL),(7,'d4535096-44a3-4f46-b42c-d1f10677edf4',NULL,'07:00:00','22:00:00',0.4600,'2026-01-01',NULL),(8,'387794cc-cb6d-4101-b56a-21f92cc703ac',NULL,'07:00:00','20:00:00',0.2200,'2026-01-01',NULL),(9,'bf8a2b2b-82b1-48f5-a837-978837259fdf',NULL,'08:00:00','18:00:00',0.4300,'2026-01-01','2026-12-31'),(10,'46578d96-ab29-4d6d-99c1-16bf8ead4770',NULL,'08:00:00','20:00:00',0.4700,'2026-01-01',NULL);
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
INSERT INTO `utenti` VALUES ('a1000000-0000-0000-0000-000000000001','admin@stazionericarica.it','+39 333 1000001','Marco','Amministratori','2026-01-01 07:00:00','completo',1),('b2000000-0000-0000-0000-000000000002','guest@stazionericarica.it','+39 333 2000002','Ospite','Generico','2026-05-01 08:00:00','ospite',1);
/*!40000 ALTER TABLE `utenti` ENABLE KEYS */;
UNLOCK TABLES;

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
