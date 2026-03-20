const express    = require('express');
const crypto     = require('crypto');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const db         = require('../database');
const router     = express.Router();

// ─── Recovery store respaldado por SQLite (sobrevive reinicios) ──────────────────
db.prepare(`
  CREATE TABLE IF NOT EXISTS recovery_tokens (
    correo      TEXT PRIMARY KEY,
    code        TEXT NOT NULL,
    reset_token TEXT NOT NULL,
    expires_at  INTEGER NOT NULL
  )
`).run();
// Limpiar tokens expirados al iniciar
db.prepare('DELETE FROM recovery_tokens WHERE expires_at < ?').run(Date.now());

const recoveryStore = {
  set(correo, data) {
    db.prepare(`
      INSERT OR REPLACE INTO recovery_tokens (correo, code, reset_token, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(correo, data.code, data.resetToken, data.expiresAt);
  },
  get(correo) {
    const row = db.prepare('SELECT * FROM recovery_tokens WHERE correo = ?').get(correo);
    if (!row) return undefined;
    return { code: row.code, resetToken: row.reset_token, expiresAt: row.expires_at };
  },
  delete(correo) {
    db.prepare('DELETE FROM recovery_tokens WHERE correo = ?').run(correo);
  },
  findByToken(resetToken) {
    const row = db.prepare('SELECT * FROM recovery_tokens WHERE reset_token = ?').get(resetToken);
    if (!row) return null;
    return { correo: row.correo, expiresAt: row.expires_at };
  }
};

/** Send recovery email. Falls back to console.log when SMTP is not configured (dev). */
async function sendRecoveryEmail(to, nombre, code) {
  if (!process.env.SMTP_USER) {
    // Development fallback — never reaches production if SMTP_USER is set
    console.log(`[DEV] Recovery code for ${to}: ${code}`);
    return;
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST   || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Código de recuperación de contraseña',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;
                  border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#0f766e;margin-top:0">Recuperación de contraseña</h2>
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>Tu código de verificación es:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#0f766e;
                    text-align:center;padding:16px;background:#f0fdf4;
                    border-radius:6px;margin:16px 0;">
          ${code}
        </div>
        <p style="color:#6b7280;font-size:14px">
          Este código expira en 10 minutos.<br>
          Si no solicitaste esto, ignora este correo.
        </p>
      </div>
    `,
  });
}

const JWT_SECRET = process.env.JWT_SECRET || 'vet-secret-change-in-production';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';
const BCRYPT_ROUNDS = 12;

/** Legacy SHA-256 helper — only used during password migration */
function sha256(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

function mapUser(raw) {
  if (!raw) return null;
  return {
    id: raw.id_usuario,
    nombreCompleto: raw.nombre_completo,
    fechaNacimiento: raw.fecha_nacimiento ?? '',
    tipoDocumento: raw.tipo_documento ?? 'dni',
    numeroDocumento: raw.numero_documento ?? '',
    direccion: raw.direccion ?? '',
    correo: raw.correo,
    celular: raw.celular ?? '',
    puestoTrabajo: raw.puesto_trabajo,
  };
}

/**
 * Verify password supporting migration from SHA-256 → bcrypt.
 * bcrypt hashes start with "$2"; SHA-256 hashes are 64-char hex.
 */
async function verifyPassword(plainText, storedHash) {
  if (storedHash && storedHash.startsWith('$2')) {
    return bcrypt.compare(plainText, storedHash);
  }
  return sha256(plainText) === storedHash;
}

// POST /api/auth/login  (public — no JWT required)
router.post('/login', async (req, res, next) => {
  try {
    const { correo, password } = req.body;
    if (!correo || !password) return res.status(400).json({ message: 'Faltan datos' });

    const user = db.prepare('SELECT * FROM usuarios WHERE correo = ?').get(correo);
    if (!user) return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });

    // Automatically re-hash legacy SHA-256 passwords to bcrypt on login
    if (!user.password_hash.startsWith('$2')) {
      const newHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      db.prepare('UPDATE usuarios SET password_hash=? WHERE id_usuario=?').run(newHash, user.id_usuario);
    }

    const token = jwt.sign(
      { id: user.id_usuario, puestoTrabajo: user.puesto_trabajo },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({ ...mapUser(user), token });
  } catch (err) { next(err); }
});

// GET /api/auth/usuarios  (protected by JWT middleware in server.js)
router.get('/usuarios', (_req, res) => {
  const users = db.prepare('SELECT * FROM usuarios').all();
  res.json(users.map(mapUser));
});

// GET /api/auth/usuarios/:id
router.get('/usuarios/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM usuarios WHERE id_usuario = ?').get(req.params.id);
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
  res.json(mapUser(user));
});

// POST /api/auth/usuarios (register — public)
router.post('/usuarios', async (req, res, next) => {
  try {
    const { nombreCompleto, fechaNacimiento, tipoDocumento, numeroDocumento,
            direccion, correo, celular, puestoTrabajo, password } = req.body;

    if (!nombreCompleto || !correo || !password || !puestoTrabajo) {
      return res.status(400).json({ ok: false, message: 'Faltan campos requeridos.' });
    }
    if (db.prepare('SELECT id_usuario FROM usuarios WHERE correo = ?').get(correo)) {
      return res.status(409).json({ ok: false, message: 'Ya existe una cuenta con ese correo.' });
    }

    const id = crypto.randomUUID();
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    db.prepare(`
      INSERT INTO usuarios (id_usuario,nombre_completo,fecha_nacimiento,tipo_documento,
        numero_documento,direccion,correo,celular,puesto_trabajo,password_hash)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(id, nombreCompleto, fechaNacimiento, tipoDocumento, numeroDocumento,
           direccion, correo, celular, puestoTrabajo, hash);

    res.status(201).json({ ok: true, message: 'Cuenta creada correctamente.', id });
  } catch (err) { next(err); }
});

// PUT /api/auth/usuarios/:id (update profile)
router.put('/usuarios/:id', (req, res) => {
  // Only the account owner can update their own profile
  if (req.user?.id !== req.params.id) {
    return res.status(403).json({ ok: false, message: 'No autorizado.' });
  }
  const { nombreCompleto, fechaNacimiento, tipoDocumento, numeroDocumento,
          direccion, correo, celular, puestoTrabajo } = req.body;
  const r = db.prepare(`
    UPDATE usuarios SET nombre_completo=?,fecha_nacimiento=?,tipo_documento=?,numero_documento=?,
      direccion=?,correo=?,celular=?,puesto_trabajo=? WHERE id_usuario=?
  `).run(nombreCompleto, fechaNacimiento, tipoDocumento, numeroDocumento,
         direccion, correo, celular, puestoTrabajo, req.params.id);
  if (r.changes === 0) return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
  const updated = db.prepare('SELECT * FROM usuarios WHERE id_usuario = ?').get(req.params.id);
  res.json({ ok: true, message: 'Perfil actualizado correctamente.', user: mapUser(updated) });
});

// POST /api/auth/usuarios/:id/password (change password — requires current password)
router.post('/usuarios/:id/password', async (req, res, next) => {
  try {
    // Only the account owner can change their own password
    if (req.user?.id !== req.params.id) {
      return res.status(403).json({ ok: false, message: 'No autorizado.' });
    }
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ ok: false, message: 'Faltan datos.' });
    }
    const user = db.prepare('SELECT * FROM usuarios WHERE id_usuario = ?').get(req.params.id);
    if (!user) return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });

    const valid = await verifyPassword(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ ok: false, message: 'La contraseña actual es incorrecta.' });

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    db.prepare('UPDATE usuarios SET password_hash=? WHERE id_usuario=?').run(newHash, user.id_usuario);
    res.json({ ok: true, message: 'Contraseña actualizada correctamente.' });
  } catch (err) { next(err); }
});

// POST /api/auth/recovery-request  (public — step 1 of reset flow)
router.post('/recovery-request', async (req, res, next) => {
  try {
    const { contact, method } = req.body;
    if (!contact) return res.status(400).json({ ok: false, message: 'Falta el contacto.' });

    const user = method === 'celular'
      ? db.prepare('SELECT * FROM usuarios WHERE celular = ?').get(contact)
      : db.prepare('SELECT * FROM usuarios WHERE correo  = ?').get(contact);

    // Return the same message regardless — prevents user enumeration
    const okMsg = { ok: true, message: 'Si existe una cuenta registrada, recibirás un código.' };
    if (!user) return res.json(okMsg);

    const code       = Math.floor(100000 + Math.random() * 900000).toString();
    const resetToken = crypto.randomUUID();
    const expiresAt  = Date.now() + 10 * 60 * 1000; // 10 minutes

    recoveryStore.set(user.correo, { code, resetToken, expiresAt });
    await sendRecoveryEmail(user.correo, user.nombre_completo, code);

    res.json(okMsg);
  } catch (err) { next(err); }
});

// POST /api/auth/recovery-verify  (public — step 2 of reset flow)
router.post('/recovery-verify', (req, res) => {
  const { contact, method, code } = req.body;
  if (!contact || !code) return res.status(400).json({ ok: false, message: 'Faltan datos.' });

  const user = method === 'celular'
    ? db.prepare('SELECT * FROM usuarios WHERE celular = ?').get(contact)
    : db.prepare('SELECT * FROM usuarios WHERE correo  = ?').get(contact);

  if (!user) return res.json({ ok: false, message: 'Código incorrecto.' });

  const record = recoveryStore.get(user.correo);
  if (!record || Date.now() > record.expiresAt) {
    recoveryStore.delete(user.correo);
    return res.json({ ok: false, message: 'El código ha expirado. Solicita uno nuevo.' });
  }
  if (record.code !== code) {
    return res.json({ ok: false, message: 'Código incorrecto.' });
  }

  res.json({ ok: true, resetToken: record.resetToken, contact: user.correo });
});

// POST /api/auth/password-reset  (public — step 3: uses one-time resetToken)
router.post('/password-reset', async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ ok: false, message: 'Faltan datos.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ ok: false, message: 'La contraseña debe tener al menos 8 caracteres.' });
    }

    // Find the correo mapped to this resetToken
    const found = recoveryStore.findByToken(resetToken);
    if (!found) {
      return res.status(400).json({ ok: false, message: 'Token inválido o expirado.' });
    }
    const correo = found.correo;
    if (Date.now() > found.expiresAt) {
      recoveryStore.delete(correo);
      return res.status(400).json({ ok: false, message: 'El token ha expirado. Solicita un nuevo código.' });
    }

    const user = db.prepare('SELECT * FROM usuarios WHERE correo = ?').get(correo);
    if (!user) return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' });

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    db.prepare('UPDATE usuarios SET password_hash=? WHERE id_usuario=?').run(newHash, user.id_usuario);
    recoveryStore.delete(correo); // one-time use

    res.json({ ok: true, message: 'Contraseña actualizada correctamente.' });
  } catch (err) { next(err); }
});

// DELETE /api/auth/usuarios/:id
router.delete('/usuarios/:id', (req, res) => {
  // Only a medico_veterinario (admin) can delete user accounts
  if (req.user?.puestoTrabajo !== 'medico_veterinario') {
    return res.status(403).json({ ok: false, message: 'Solo el administrador puede eliminar cuentas.' });
  }
  // Cannot delete own account
  if (req.user?.id === req.params.id) {
    return res.status(400).json({ ok: false, message: 'No puedes eliminar tu propia cuenta.' });
  }
  const r = db.prepare('DELETE FROM usuarios WHERE id_usuario = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' });
  res.json({ ok: true });
});

// ─── Change-password verification store (reuses recovery_tokens table) ────────
// We use a separate in-memory map keyed by userId so it doesn't clash with
// the email-keyed recovery flow.
const changeCodeStore = new Map(); // userId -> { code, changeToken, expiresAt }

// POST /api/auth/usuarios/:id/send-change-code
// Sends a 6-digit code to the user's email or phone (SMS not wired — falls back to email).
router.post('/usuarios/:id/send-change-code', async (req, res, next) => {
  try {
    const { method } = req.body; // 'correo' | 'celular'
    const user = db.prepare('SELECT * FROM usuarios WHERE id_usuario = ?').get(req.params.id);
    if (!user) return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' });

    const code        = Math.floor(100000 + Math.random() * 900000).toString();
    const changeToken = crypto.randomUUID();
    const expiresAt   = Date.now() + 10 * 60 * 1000; // 10 min

    changeCodeStore.set(user.id_usuario, { code, changeToken, expiresAt, method });

    // Always send via email regardless of chosen method (SMS requires external service).
    // When method === 'celular' we still email the code and show it was sent.
    await sendRecoveryEmail(user.correo, user.nombre_completo, code);

    // Mask contact for display
    const maskedContact = method === 'celular'
      ? (user.celular || '').replace(/^(\d{2,3})\d+(\d{2})$/, '$1****$2') ||
        (user.celular || '').substring(0, 3) + '****'
      : (() => {
          const [local, domain] = (user.correo || '').split('@');
          if (!domain) return user.correo;
          const visible = Math.min(2, local.length);
          const masked = local.substring(0, visible) + '*'.repeat(Math.max(0, local.length - visible));
          return `${masked}@${domain}`;
        })();

    res.json({ ok: true, message: `Código enviado`, maskedContact });
  } catch (err) { next(err); }
});

// POST /api/auth/usuarios/:id/verify-change-code
router.post('/usuarios/:id/verify-change-code', (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ ok: false, message: 'Falta el código.' });

  const record = changeCodeStore.get(req.params.id);
  if (!record || Date.now() > record.expiresAt) {
    changeCodeStore.delete(req.params.id);
    return res.json({ ok: false, message: 'El código ha expirado. Solicita uno nuevo.' });
  }
  if (record.code !== String(code)) {
    return res.json({ ok: false, message: 'Código incorrecto.' });
  }

  res.json({ ok: true, changeToken: record.changeToken });
});

// POST /api/auth/usuarios/:id/password-with-token  (change password using verified token)
router.post('/usuarios/:id/password-with-token', async (req, res, next) => {
  try {
    const { changeToken, newPassword } = req.body;
    if (!changeToken || !newPassword) {
      return res.status(400).json({ ok: false, message: 'Faltan datos.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ ok: false, message: 'La contraseña debe tener al menos 8 caracteres.' });
    }

    const record = changeCodeStore.get(req.params.id);
    if (!record || record.changeToken !== changeToken || Date.now() > record.expiresAt) {
      changeCodeStore.delete(req.params.id);
      return res.status(400).json({ ok: false, message: 'Token inválido o expirado. Solicita un nuevo código.' });
    }

    const user = db.prepare('SELECT * FROM usuarios WHERE id_usuario = ?').get(req.params.id);
    if (!user) return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' });

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    db.prepare('UPDATE usuarios SET password_hash=? WHERE id_usuario=?').run(newHash, user.id_usuario);
    changeCodeStore.delete(req.params.id); // one-time use

    res.json({ ok: true, message: 'Contraseña actualizada correctamente.' });
  } catch (err) { next(err); }
});

module.exports = router;
