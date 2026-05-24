const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dbPath = path.join(root, 'database.sql');
const fragPath = path.join(root, '_seed_fragments.sql');

let db = fs.readFileSync(dbPath, 'utf8');
const frag = fs.readFileSync(fragPath, 'utf8');

function extractBlock(label) {
  const re = new RegExp(`INSERT ${label}:\\n([\\s\\S]*?);\\n`, 'm');
  const m = frag.match(re);
  if (!m) throw new Error(`Missing ${label} in fragments`);
  return m[1].trim();
}

const accValues = extractBlock('accumulatori');
const puntiValues = extractBlock('punti');

db = db.replace(
  /CREATE TABLE `punti_ricarica` \([\s\S]*?\) ENGINE=InnoDB/,
  `CREATE TABLE \`punti_ricarica\` (
  \`id_punto\` char(36) NOT NULL,
  \`id_stazione\` char(36) NOT NULL,
  \`id_accumulatore\` char(36) NOT NULL,
  \`identificativo_fisico\` varchar(50) DEFAULT NULL,
  \`tipo_veicolo\` enum('auto','bici','monopattino') NOT NULL,
  \`tipo_connettore\` varchar(30) DEFAULT NULL,
  \`potenza_max_kw\` decimal(6,2) DEFAULT NULL,
  \`stato_hardware\` enum('online','offline','guasto','manutenzione_programmata') DEFAULT 'online',
  \`data_ultimo_heartbeat\` timestamp NULL DEFAULT NULL,
  \`tariffa_predefinita\` decimal(6,4) DEFAULT NULL,
  \`metodi_autenticazione_supportati\` longtext DEFAULT NULL,
  PRIMARY KEY (\`id_punto\`),
  KEY \`idx_punti_stazione\` (\`id_stazione\`),
  KEY \`idx_punti_accumulatore\` (\`id_accumulatore\`,\`tipo_veicolo\`),
  KEY \`idx_punti_heartbeat\` (\`data_ultimo_heartbeat\`),
  KEY \`idx_punti_hardware\` (\`stato_hardware\`),
  CONSTRAINT \`punti_ricarica_ibfk_1\` FOREIGN KEY (\`id_stazione\`) REFERENCES \`stazioni\` (\`id_stazione\`) ON DELETE CASCADE,
  CONSTRAINT \`punti_ricarica_ibfk_2\` FOREIGN KEY (\`id_accumulatore\`) REFERENCES \`accumulatori_stazione\` (\`id_accumulatore\`) ON DELETE CASCADE
) ENGINE=InnoDB`
);

db = db.replace(
  /CREATE TABLE `utenti` \([\s\S]*?\) ENGINE=InnoDB/,
  `CREATE TABLE \`utenti\` (
  \`id_utente\` char(36) NOT NULL,
  \`email\` varchar(255) DEFAULT NULL,
  \`password_hash\` varchar(255) DEFAULT NULL,
  \`cellulare\` varchar(20) DEFAULT NULL,
  \`nome\` varchar(100) DEFAULT NULL,
  \`cognome\` varchar(100) DEFAULT NULL,
  \`data_registrazione\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`tipo_account\` enum('completo','badge_anonimo','ospite') DEFAULT 'completo',
  \`attivo\` tinyint(1) DEFAULT 1,
  PRIMARY KEY (\`id_utente\`),
  UNIQUE KEY \`email\` (\`email\`),
  KEY \`idx_utenti_email\` (\`email\`),
  KEY \`idx_utenti_cellulare\` (\`cellulare\`)
) ENGINE=InnoDB`
);

db = db.replace(
  /INSERT INTO `accumulatori_stazione` VALUES [\s\S]*?;/,
  `INSERT INTO \`accumulatori_stazione\` VALUES ${accValues};`
);

db = db.replace(
  /INSERT INTO `punti_ricarica` VALUES [\s\S]*?;/,
  `INSERT INTO \`punti_ricarica\` VALUES ${puntiValues};`
);

db = db.replace(
  /INSERT INTO `tariffe_orarie` VALUES [\s\S]*?;/,
  '-- Nessuna tariffa oraria: si usa solo tariffa_predefinita su punti_ricarica'
);

db = db.replace(/INSERT INTO `badge_utente` VALUES [\s\S]*?;\n/, '');

db = db.replace(
  /INSERT INTO `utenti` VALUES [\s\S]*?;/,
  `INSERT INTO \`utenti\` VALUES ('a1000000-0000-0000-0000-000000000001','admin@stazionericarica.it',NULL,'+39 02 1234567','Paolo','Marchesini','2026-01-15 09:00:00','completo',1);`
);

db = db.replace(
  /AUTO_INCREMENT=\d+ DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;\n\/\*!40101 SET character_set_client = @saved_cs_client \*\/;\n\n--\n-- Dumping data for table `tariffe_orarie`/,
  `AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;\n/*!40101 SET character_set_client = @saved_cs_client */;\n\n--\n-- Dumping data for table \`tariffe_orarie\``
);

const header = `-- Installazione pulita GreenSchool: importare solo questo file.
-- Admin: admin@stazionericarica.it / admin123 (password_hash NULL, fallback in PHP).
-- Accumulatori: stato attivo se percentuale_carica > soglia_minima_perc, altrimenti offline.
-- Gamification: tabelle utente_gamification e missioni_giornaliere_progresso incluse (vuote).
-- Vuoti: sessioni_ricarica, storico_livello_batteria, badge_utente, gamification.
-- Seed: 10 accumulatori, punti di ricarica; tariffe solo in punti_ricarica.tariffa_predefinita.

`;

db = db.replace(
  /-- Installazione pulita[\s\S]*?-- Seed: 10 accumulatori[\s\S]*?\n\n/,
  header
);
if (!db.includes('admin@stazionericarica.it / admin123')) {
  db = db.replace(/USE `stazione_ricarica`;\n/, `USE \`stazione_ricarica\`;\n\n${header}`);
}

fs.writeFileSync(dbPath, db);
console.log('Patched', dbPath, `(${puntiValues.split('),(').length} punti circa)`);
