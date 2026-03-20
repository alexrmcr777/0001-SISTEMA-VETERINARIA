const express = require('express');
const db = require('../database');
const router = express.Router();

const ESTADOS_VALIDOS = ['Programada', 'Confirmada', 'Atendida', 'Cancelada', 'No asistió', 'Reprogramada'];

const SELECT = `
  SELECT c.id_cita, c.id_mascota, c.id_veterinario, c.fecha, c.hora,
         c.motivo, c.estado, c.comentarios, c.creado_en,
         m.nombre AS mascota,
         d.nombre AS dueno,
         u.nombre_completo AS veterinario
  FROM citas c
  LEFT JOIN mascotas m ON c.id_mascota = m.id_mascota
  LEFT JOIN duenos   d ON m.id_dueno   = d.id_dueno
  LEFT JOIN usuarios u ON c.id_veterinario = u.id_usuario`;

// GET /api/citas?fecha=&estado=&mascota=
router.get('/', (req, res) => {
  let sql = SELECT;
  const params = [];
  const where = [];
  if (req.query.fecha)   { where.push('c.fecha = ?');           params.push(req.query.fecha); }
  if (req.query.estado)  { where.push('c.estado = ?');          params.push(req.query.estado); }
  if (req.query.mascota) { where.push('m.nombre LIKE ?');       params.push(`%${req.query.mascota}%`); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY c.fecha DESC, c.hora ASC';
  res.json(db.prepare(sql).all(...params));
});

// GET /api/citas/:id
router.get('/:id', (req, res) => {
  const c = db.prepare(SELECT + ' WHERE c.id_cita = ?').get(req.params.id);
  if (!c) return res.status(404).json({ message: 'Cita no encontrada' });
  res.json(c);
});

// POST /api/citas
router.post('/', (req, res) => {
  let { id_mascota, id_veterinario, fecha, hora, motivo, estado, comentarios, mascota, veterinario } = req.body;

  // Resolve name → ID if needed (backward compat with frontend string fields)
  if (!id_mascota && mascota) {
    const m = db.prepare('SELECT id_mascota FROM mascotas WHERE nombre = ?').get(mascota);
    if (m) id_mascota = m.id_mascota;
  }
  if (!id_veterinario && veterinario) {
    const u = db.prepare("SELECT id_usuario FROM usuarios WHERE nombre_completo LIKE ?").get(`%${veterinario}%`);
    if (u) id_veterinario = u.id_usuario;
  }

  if (!id_mascota) return res.status(400).json({ message: 'Se requiere id_mascota o nombre de mascota válido' });
  if (!fecha || !hora)  return res.status(400).json({ message: 'Se requieren fecha y hora.' });
  if (estado && !ESTADOS_VALIDOS.includes(estado)) return res.status(400).json({ message: 'Estado no válido.' });

  // Prevent scheduling in the past
  if (fecha < new Date().toISOString().split('T')[0]) {
    return res.status(400).json({ message: 'No se puede agendar una cita en el pasado.' });
  }

  // Prevent duplicate: same mascota + veterinario + fecha + hora
  if (id_veterinario) {
    const dup = db.prepare(
      "SELECT id_cita FROM citas WHERE id_mascota=? AND id_veterinario=? AND fecha=? AND hora=? AND estado NOT IN ('Cancelada','No asistió')"
    ).get(id_mascota, id_veterinario, fecha, hora);
    if (dup) return res.status(409).json({ message: 'Ya existe una cita para esa mascota con ese veterinario en esa fecha y hora.' });
  }

  const result = db.prepare(`
    INSERT INTO citas (id_mascota,id_veterinario,fecha,hora,motivo,estado,comentarios)
    VALUES (?,?,?,?,?,?,?)
  `).run(id_mascota, id_veterinario ?? null, fecha, hora, motivo, estado || 'Programada', comentarios);
  res.status(201).json({ id_cita: result.lastInsertRowid });
});

// PUT /api/citas/:id
router.put('/:id', (req, res) => {
  const { id_mascota, id_veterinario, fecha, hora, motivo, estado, comentarios } = req.body;
  if (estado && !ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ message: 'Estado no válido.' });
  }
  const r = db.prepare(`
    UPDATE citas SET id_mascota=?,id_veterinario=?,fecha=?,hora=?,motivo=?,estado=?,comentarios=?
    WHERE id_cita=?
  `).run(id_mascota, id_veterinario, fecha, hora, motivo, estado, comentarios, req.params.id);
  if (r.changes === 0) return res.status(404).json({ message: 'Cita no encontrada' });
  res.json({ ok: true });
});

// PATCH /api/citas/:id/estado
router.patch('/:id/estado', (req, res) => {
  const { estado } = req.body;
  if (!ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ message: 'Estado no válido.' });
  }
  const r = db.prepare('UPDATE citas SET estado=? WHERE id_cita=?').run(estado, req.params.id);
  if (r.changes === 0) return res.status(404).json({ message: 'Cita no encontrada' });
  res.json({ ok: true });
});

// PATCH /api/citas/:id/reprogramar
router.patch('/:id/reprogramar', (req, res) => {
  const { fecha, hora } = req.body;
  if (!fecha || !hora) return res.status(400).json({ message: 'Se requieren fecha y hora.' });
  const r = db.prepare('UPDATE citas SET fecha=?, hora=?, estado=? WHERE id_cita=?')
    .run(fecha, hora, 'Reprogramada', req.params.id);
  if (r.changes === 0) return res.status(404).json({ message: 'Cita no encontrada' });
  res.json({ ok: true });
});

// DELETE /api/citas/:id
router.delete('/:id', (req, res) => {
  const r = db.prepare('DELETE FROM citas WHERE id_cita = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ message: 'Cita no encontrada' });
  res.json({ ok: true });
});

module.exports = router;
