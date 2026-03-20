const express = require('express');
const db = require('../database');
const router = express.Router();

// SELECT sin foto para listados (evita transferir MB innecesarios)
const SELECT_LIST = `
  SELECT m.id_mascota, m.id_dueno, m.nombre, m.especie, m.raza, m.fecha_nacimiento,
         d.nombre AS dueno, d.telefono, d.email
  FROM mascotas m
  LEFT JOIN duenos d ON m.id_dueno = d.id_dueno`;

// SELECT con foto para detalle individual
const SELECT = `
  SELECT m.id_mascota, m.id_dueno, m.nombre, m.especie, m.raza, m.fecha_nacimiento, m.foto,
         d.nombre AS dueno, d.telefono, d.email
  FROM mascotas m
  LEFT JOIN duenos d ON m.id_dueno = d.id_dueno`;

// GET /api/mascotas?nombre=&dueno=
router.get('/', (req, res, next) => {
  try {
    let sql = SELECT_LIST;
    const params = [];
    const where = [];
    if (req.query.nombre) { where.push('m.nombre LIKE ?'); params.push(`%${req.query.nombre}%`); }
    if (req.query.dueno)  { where.push('d.nombre LIKE ?'); params.push(`%${req.query.dueno}%`); }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY m.nombre';
    res.json(db.prepare(sql).all(...params));
  } catch (err) { next(err); }
});

// GET /api/mascotas/:id
router.get('/:id', (req, res, next) => {
  try {
    const m = db.prepare(SELECT + ' WHERE m.id_mascota = ?').get(req.params.id);
    if (!m) return res.status(404).json({ message: 'Mascota no encontrada' });
    res.json(m);
  } catch (err) { next(err); }
});

// POST /api/mascotas
// Accepts id_dueno OR {dueno, telefono, email, direccion} — auto-creates/matches dueno
router.post('/', (req, res, next) => {
  try {
    const { nombre, especie, raza, fecha_nacimiento, foto, dueno, telefono, email, direccion } = req.body;
    let { id_dueno } = req.body;

    if (!nombre || !nombre.trim()) return res.status(400).json({ message: 'El nombre de la mascota es requerido.' });

    if (!id_dueno && dueno) {
      let existing = db.prepare('SELECT id_dueno FROM duenos WHERE email = ?').get(email);
      if (existing) {
        id_dueno = existing.id_dueno;
        db.prepare('UPDATE duenos SET nombre=?,telefono=? WHERE id_dueno=?').run(dueno, telefono, id_dueno);
      } else {
        const r = db.prepare('INSERT INTO duenos (nombre,telefono,email,direccion) VALUES (?,?,?,?)').run(dueno, telefono, email, direccion ?? '');
        id_dueno = r.lastInsertRowid;
      }
    }

    if (!id_dueno) return res.status(400).json({ message: 'Se requiere id_dueno o datos del dueño' });

    const result = db.prepare('INSERT INTO mascotas (id_dueno,nombre,especie,raza,fecha_nacimiento,foto) VALUES (?,?,?,?,?,?)').run(id_dueno, nombre, especie, raza, fecha_nacimiento, foto);
    res.status(201).json({ id_mascota: result.lastInsertRowid });
  } catch (err) { next(err); }
});

// PUT /api/mascotas/:id
router.put('/:id', (req, res, next) => {
  try {
    const { nombre, especie, raza, fecha_nacimiento, foto, dueno, telefono, email, direccion } = req.body;
    let { id_dueno } = req.body;

    if (!nombre || !nombre.trim()) return res.status(400).json({ message: 'El nombre de la mascota es requerido.' });

    if (!id_dueno && dueno) {
      let existing = db.prepare('SELECT id_dueno FROM duenos WHERE email = ?').get(email);
      if (existing) {
        id_dueno = existing.id_dueno;
        db.prepare('UPDATE duenos SET nombre=?,telefono=? WHERE id_dueno=?').run(dueno, telefono, id_dueno);
      } else {
        const r = db.prepare('INSERT INTO duenos (nombre,telefono,email,direccion) VALUES (?,?,?,?)').run(dueno, telefono, email, direccion ?? '');
        id_dueno = r.lastInsertRowid;
      }
    }

    const r = db.prepare('UPDATE mascotas SET id_dueno=?,nombre=?,especie=?,raza=?,fecha_nacimiento=?,foto=? WHERE id_mascota=?').run(id_dueno, nombre, especie, raza, fecha_nacimiento, foto, req.params.id);
    if (r.changes === 0) return res.status(404).json({ message: 'Mascota no encontrada' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/mascotas/:id
router.delete('/:id', (req, res, next) => {
  try {
    const count = (db.prepare('SELECT COUNT(*) as n FROM consultas WHERE id_mascota = ?').get(req.params.id))?.n ?? 0;
    if (count > 0) {
      return res.status(409).json({ message: `No se puede eliminar: esta mascota tiene ${count} consulta(s) registrada(s).` });
    }
    const r = db.prepare('DELETE FROM mascotas WHERE id_mascota = ?').run(req.params.id);
    if (r.changes === 0) return res.status(404).json({ message: 'Mascota no encontrada' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
