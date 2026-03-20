const express = require('express');
const db = require('../database');
const router = express.Router();

const SELECT = `
  SELECT c.*,
         m.nombre AS nombre_mascota,
         u.nombre_completo AS nombre_veterinario
  FROM consultas c
  LEFT JOIN mascotas m ON c.id_mascota = m.id_mascota
  LEFT JOIN usuarios u ON c.id_veterinario = u.id_usuario`;

// Range limits for vital signs
const VITAL_LIMITS = {
  peso_kg:                 { min: 0.1,  max: 250 },
  temperatura_c:           { min: 35,   max: 43  },
  frecuencia_cardiaca:     { min: 20,   max: 400 },
  frecuencia_respiratoria: { min: 5,    max: 120 },
};

function validateVitals(body) {
  for (const [field, { min, max }] of Object.entries(VITAL_LIMITS)) {
    const val = body[field];
    if (val != null && val !== '') {
      const num = Number(val);
      if (isNaN(num) || num < min || num > max) {
        return `${field} fuera de rango (${min}–${max}).`;
      }
    }
  }
  return null;
}

// Middleware: only medico_veterinario can modify consultations
function requireVet(req, res, next) {
  if (req.user?.puestoTrabajo !== 'medico_veterinario') {
    return res.status(403).json({ message: 'Solo el médico veterinario puede gestionar consultas.' });
  }
  next();
}

// GET /api/consultas?id_mascota=
router.get('/', (req, res, next) => {
  try {
    let sql = SELECT;
    const params = [];
    if (req.query.id_mascota) {
      sql += ' WHERE c.id_mascota = ?';
      params.push(req.query.id_mascota);
    }
    sql += ' ORDER BY c.fecha DESC, c.hora ASC';
    res.json(db.prepare(sql).all(...params));
  } catch (err) { next(err); }
});

// GET /api/consultas/:id
router.get('/:id', (req, res, next) => {
  try {
    const c = db.prepare(SELECT + ' WHERE c.id_consulta = ?').get(req.params.id);
    if (!c) return res.status(404).json({ message: 'Consulta no encontrada' });
    res.json(c);
  } catch (err) { next(err); }
});

// POST /api/consultas  (vet only)
router.post('/', requireVet, (req, res, next) => {
  try {
    const {
      id_mascota, id_veterinario, id_cita, fecha, hora, motivo_consulta,
      peso_kg, temperatura_c, frecuencia_cardiaca, frecuencia_respiratoria,
      diagnostico, tratamiento, medicamentos, proxima_cita, observaciones
    } = req.body;
    if (!id_mascota || !id_veterinario || !fecha || !hora || !motivo_consulta) {
      return res.status(400).json({ message: 'Faltan campos requeridos: id_mascota, id_veterinario, fecha, hora y motivo_consulta.' });
    }
    const vitalError = validateVitals(req.body);
    if (vitalError) return res.status(400).json({ message: vitalError });

    const result = db.prepare(`
      INSERT INTO consultas
        (id_mascota,id_veterinario,id_cita,fecha,hora,motivo_consulta,
         peso_kg,temperatura_c,frecuencia_cardiaca,frecuencia_respiratoria,
         diagnostico,tratamiento,medicamentos,proxima_cita,observaciones)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      id_mascota, id_veterinario, id_cita || null, fecha, hora, motivo_consulta,
      peso_kg ?? null, temperatura_c ?? null, frecuencia_cardiaca ?? null,
      frecuencia_respiratoria ?? null, diagnostico, tratamiento ?? null,
      medicamentos ?? null, proxima_cita ?? null, observaciones ?? null
    );
    // Si la consulta está vinculada a una cita, marcarla como Atendida automáticamente
    if (id_cita) {
      db.prepare("UPDATE citas SET estado = 'Atendida' WHERE id_cita = ?").run(id_cita);
    }
    res.status(201).json({ id_consulta: result.lastInsertRowid });
  } catch (err) { next(err); }
});

// PUT /api/consultas/:id  (vet only)
router.put('/:id', requireVet, (req, res, next) => {
  try {
    const {
      id_mascota, id_veterinario, id_cita, fecha, hora, motivo_consulta,
      peso_kg, temperatura_c, frecuencia_cardiaca, frecuencia_respiratoria,
      diagnostico, tratamiento, medicamentos, proxima_cita, observaciones
    } = req.body;
    const vitalError = validateVitals(req.body);
    if (vitalError) return res.status(400).json({ message: vitalError });

    const r = db.prepare(`
      UPDATE consultas SET
        id_mascota=?,id_veterinario=?,id_cita=?,fecha=?,hora=?,motivo_consulta=?,
        peso_kg=?,temperatura_c=?,frecuencia_cardiaca=?,frecuencia_respiratoria=?,
        diagnostico=?,tratamiento=?,medicamentos=?,proxima_cita=?,observaciones=?
      WHERE id_consulta=?
    `).run(
      id_mascota, id_veterinario, id_cita || null, fecha, hora, motivo_consulta,
      peso_kg ?? null, temperatura_c ?? null, frecuencia_cardiaca ?? null,
      frecuencia_respiratoria ?? null, diagnostico, tratamiento ?? null,
      medicamentos ?? null, proxima_cita ?? null, observaciones ?? null,
      req.params.id
    );
    if (r.changes === 0) return res.status(404).json({ message: 'Consulta no encontrada' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/consultas/:id  (vet only)
router.delete('/:id', requireVet, (req, res, next) => {
  try {
    const r = db.prepare('DELETE FROM consultas WHERE id_consulta = ?').run(req.params.id);
    if (r.changes === 0) return res.status(404).json({ message: 'Consulta no encontrada' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
