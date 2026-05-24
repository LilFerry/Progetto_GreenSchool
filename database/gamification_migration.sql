-- Gamification GreenSchool — eseguire su DB esistente:
-- mysql -u root stazione_ricarica < database/gamification_migration.sql

USE `stazione_ricarica`;

CREATE TABLE IF NOT EXISTS `utente_gamification` (
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

CREATE TABLE IF NOT EXISTS `missioni_giornaliere_progresso` (
  `id_utente` char(36) NOT NULL,
  `data_missione` date NOT NULL,
  `codice_missione` varchar(40) NOT NULL,
  `progresso` decimal(10,3) NOT NULL DEFAULT 0.000,
  `completata` tinyint(1) NOT NULL DEFAULT 0,
  `xp_bonus_riscosso` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_utente`, `data_missione`, `codice_missione`),
  CONSTRAINT `missioni_progresso_ibfk_1` FOREIGN KEY (`id_utente`) REFERENCES `utenti` (`id_utente`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
