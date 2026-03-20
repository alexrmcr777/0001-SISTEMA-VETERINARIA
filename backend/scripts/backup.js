/**
 * Backup script — copies the SQLite database to the backups/ folder.
 * Run manually:  node backend/scripts/backup.js
 * Schedule with cron (Linux):  0 2 * * * node /path/to/backend/scripts/backup.js
 * Schedule with Task Scheduler (Windows): point to node + this script
 */
const fs   = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DB_PATH   = process.env.DB_PATH || path.join(__dirname, '..', 'veterinaria.db');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

if (!fs.existsSync(DB_PATH)) {
  console.error(`❌  Base de datos no encontrada en: ${DB_PATH}`);
  process.exit(1);
}

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Filename: vet_2026-03-17_02-00-00.db
const stamp = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 19);
const dest  = path.join(BACKUP_DIR, `vet_${stamp}.db`);

fs.copyFileSync(DB_PATH, dest);
console.log(`✅  Backup creado: ${dest}`);

// Keep only the last 30 backups (auto-cleanup)
const backups = fs.readdirSync(BACKUP_DIR)
  .filter(f => f.startsWith('vet_') && f.endsWith('.db'))
  .sort();

while (backups.length > 30) {
  const old = path.join(BACKUP_DIR, backups.shift());
  fs.unlinkSync(old);
  console.log(`🗑️   Backup antiguo eliminado: ${old}`);
}
