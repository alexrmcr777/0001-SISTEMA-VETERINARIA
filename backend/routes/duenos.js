const express = require('express');
const db = require('../database');
const router = express.Router();

// GET /api/duenos
router.get('/', (_req, res, next) => {
  try {
    res.json(db.prepare('SELECT * FROM duenos ORDER BY nombre').all());
  } catch (err) { next(err); }
});

// GET /api/duenos/:id
router.get('/:id', (req, res, next) => {
  try {
    const d = db.prepare('SELECT * FROM duenos WHERE id_dueno = ?').get(req.params.id);
    if (!d) return res.status(404).json({ message: 'Dueño no encontrado' });
    res.json(d);
  } catch (err) { next(err); }
});

// POST /api/duenos
router.post('/', (req, res, next) => {
  try {
    const { nombre, telefono, email, direccion } = req.body;
    if (!nombre || !nombre.trim()) return res.status(400).json({ message: 'El nombre del dueño es requerido.' });
    const result = db.prepare('INSERT INTO duenos (nombre,telefono,email,direccion) VALUES (?,?,?,?)').run(nombre.trim(), telefono, email, direccion);
    res.status(201).json({ id_dueno: result.lastInsertRowid });
  } catch (err) { next(err); }
});

// PUT /api/duenos/:id
router.put('/:id', (req, res, next) => {
  try {
    const { nombre, telefono, email, direccion } = req.body;
    if (!nombre || !nombre.trim()) return res.status(400).json({ message: 'El nombre del dueño es requerido.' });
    const r = db.prepare('UPDATE duenos SET nombre=?,telefono=?,email=?,direccion=? WHERE id_dueno=?').run(nombre.trim(), telefono, email, direccion, req.params.id);
    if (r.changes === 0) return res.status(404).json({ message: 'Dueño no encontrado' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/duenos/:id
router.delete('/:id', (req, res, next) => {
  try {
    const count = (db.prepare('SELECT COUNT(*) as n FROM mascotas WHERE id_dueno = ?').get(req.params.id))?.n ?? 0;
    if (count > 0) {
      return res.status(409).json({ message: `No se puede eliminar: este dueño tiene ${count} mascota(s) registrada(s). Elimina o reasigna las mascotas primero.` });
    }
    const r = db.prepare('DELETE FROM duenos WHERE id_dueno = ?').run(req.params.id);
    if (r.changes === 0) return res.status(404).json({ message: 'Dueño no encontrado' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
