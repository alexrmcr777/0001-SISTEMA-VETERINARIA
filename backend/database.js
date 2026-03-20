const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'veterinaria.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ───────────────────────── Schema ─────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario       TEXT PRIMARY KEY,
    nombre_completo  TEXT NOT NULL,
    fecha_nacimiento TEXT,
    tipo_documento   TEXT,
    numero_documento TEXT,
    direccion        TEXT,
    correo           TEXT UNIQUE NOT NULL,
    celular          TEXT,
    puesto_trabajo   TEXT NOT NULL,
    password_hash    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS duenos (
    id_dueno  INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre    TEXT NOT NULL,
    telefono  TEXT,
    email     TEXT,
    direccion TEXT
  );

  CREATE TABLE IF NOT EXISTS mascotas (
    id_mascota       INTEGER PRIMARY KEY AUTOINCREMENT,
    id_dueno         INTEGER NOT NULL REFERENCES duenos(id_dueno) ON DELETE RESTRICT,
    nombre           TEXT NOT NULL,
    especie          TEXT,
    raza             TEXT,
    fecha_nacimiento TEXT,
    foto             TEXT
  );

  CREATE TABLE IF NOT EXISTS citas (
    id_cita        INTEGER PRIMARY KEY AUTOINCREMENT,
    id_mascota     INTEGER NOT NULL REFERENCES mascotas(id_mascota) ON DELETE CASCADE,
    id_veterinario TEXT REFERENCES usuarios(id_usuario),
    fecha          TEXT NOT NULL,
    hora           TEXT NOT NULL,
    motivo         TEXT,
    estado         TEXT NOT NULL DEFAULT 'Programada',
    comentarios    TEXT,
    creado_en      TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS consultas (
    id_consulta             INTEGER PRIMARY KEY AUTOINCREMENT,
    id_mascota              INTEGER NOT NULL REFERENCES mascotas(id_mascota) ON DELETE CASCADE,
    id_veterinario          TEXT REFERENCES usuarios(id_usuario),
    id_cita                 INTEGER REFERENCES citas(id_cita),
    fecha                   TEXT NOT NULL,
    hora                    TEXT NOT NULL,
    motivo_consulta         TEXT NOT NULL,
    peso_kg                 REAL,
    temperatura_c           REAL,
    frecuencia_cardiaca     INTEGER,
    frecuencia_respiratoria INTEGER,
    diagnostico             TEXT NOT NULL,
    tratamiento             TEXT,
    medicamentos            TEXT,
    proxima_cita            TEXT,
    observaciones           TEXT
  );
`);

// ───────────────────────── Indexes ────────────────────────
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_citas_fecha          ON citas(fecha);
  CREATE INDEX IF NOT EXISTS idx_consultas_fecha      ON consultas(fecha);
  CREATE INDEX IF NOT EXISTS idx_citas_estado         ON citas(estado);
  CREATE INDEX IF NOT EXISTS idx_mascotas_dueno       ON mascotas(id_dueno);
  CREATE INDEX IF NOT EXISTS idx_consultas_mascota    ON consultas(id_mascota);
  CREATE INDEX IF NOT EXISTS idx_citas_veterinario    ON citas(id_veterinario);
  CREATE INDEX IF NOT EXISTS idx_consultas_veterinario ON consultas(id_veterinario);
`);

// ───────────────────────── Seed ───────────────────────────
function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

const today = new Date().toISOString().split('T')[0];

const insertU = db.prepare(`
  INSERT OR IGNORE INTO usuarios
    (id_usuario, nombre_completo, fecha_nacimiento, tipo_documento, numero_documento,
     direccion, correo, celular, puesto_trabajo, password_hash)
  VALUES (?,?,?,?,?,?,?,?,?,?)`);

insertU.run('medico-001','Dr. García','1980-05-15','dni','12345678','Av. Principal 100','medico@vet.com','987654321','medico_veterinario',sha256('medico123'));
insertU.run('recep-001','María Recepción','1990-03-20','dni','87654321','Calle 2 N50','recepcion@vet.com','912345678','recepcionista',sha256('recep123'));

const insertD = db.prepare(`INSERT OR IGNORE INTO duenos (id_dueno,nombre,telefono,email,direccion) VALUES (?,?,?,?,?)`);
insertD.run(1,'Juan Perez','987654321','juan@mail.com','Av. Lima 123');
insertD.run(2,'Maria Lopez','912345678','maria@mail.com','Jr. Rosa 456');
insertD.run(3,'Carlos Ruiz','955443322','carlos@mail.com','Calle 3 N89');

const insertM = db.prepare(`INSERT OR IGNORE INTO mascotas (id_mascota,id_dueno,nombre,especie,raza) VALUES (?,?,?,?,?)`);
insertM.run(1,1,'Lucas','Perro','Labrador');
insertM.run(2,2,'Pelusa','Gato','Persa');
insertM.run(3,3,'Rex','Perro','Pastor Alemán');

const insertC = db.prepare(`INSERT OR IGNORE INTO citas (id_cita,id_mascota,id_veterinario,fecha,hora,motivo,estado) VALUES (?,?,?,?,?,?,?)`);
insertC.run(1,1,'medico-001',today,'10:00','Control general','Programada');
insertC.run(2,2,'medico-001',today,'11:30','Vacunación','Programada');
insertC.run(3,3,'medico-001',today,'14:00','Revisión postoperatoria','Programada');

module.exports = db;
