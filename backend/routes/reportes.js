const express = require('express');
const db = require('../database');
const router = express.Router();

// ── Pre-compiled statements (compiled once at startup, not on every request) ──
const stmtCitas = db.prepare(`
  SELECT
    c.id_cita, c.fecha, c.hora,
    m.nombre  AS mascota,
    d.nombre  AS dueno,
    u.nombre_completo AS veterinario,
    c.motivo, c.estado, c.comentarios
  FROM citas c
  LEFT JOIN mascotas m ON c.id_mascota    = m.id_mascota
  LEFT JOIN duenos   d ON m.id_dueno      = d.id_dueno
  LEFT JOIN usuarios u ON c.id_veterinario = u.id_usuario
  WHERE c.fecha BETWEEN ? AND ?
  ORDER BY c.fecha ASC, c.hora ASC
`);

const stmtConsultas = db.prepare(`
  SELECT
    co.id_consulta, co.fecha,
    m.nombre  AS mascota,
    d.nombre  AS dueno,
    u.nombre_completo AS veterinario,
    co.motivo_consulta AS motivo,
    co.diagnostico, co.tratamiento, co.observaciones,
    co.peso_kg, co.temperatura_c
  FROM consultas co
  LEFT JOIN mascotas m ON co.id_mascota    = m.id_mascota
  LEFT JOIN duenos   d ON m.id_dueno       = d.id_dueno
  LEFT JOIN usuarios u ON co.id_veterinario = u.id_usuario
  WHERE co.fecha BETWEEN ? AND ?
  ORDER BY co.fecha ASC
`);

// Single aggregation query replaces 6 individual COUNT queries
const stmtResumenCitas = db.prepare(`
  SELECT
    COUNT(*) AS total,
    SUM(CASE WHEN estado='Atendida'   THEN 1 ELSE 0 END) AS atendidas,
    SUM(CASE WHEN estado='Confirmada' THEN 1 ELSE 0 END) AS confirmadas,
    SUM(CASE WHEN estado='Programada' THEN 1 ELSE 0 END) AS programadas,
    SUM(CASE WHEN estado='Cancelada'  THEN 1 ELSE 0 END) AS canceladas,
    SUM(CASE WHEN estado='No asistió' THEN 1 ELSE 0 END) AS no_asistio
  FROM citas
  WHERE fecha BETWEEN ? AND ?
`);

const stmtResumenConsultas = db.prepare(
  'SELECT COUNT(*) AS total FROM consultas WHERE fecha BETWEEN ? AND ?'
);

const stmtPacientes = db.prepare(`
  SELECT
    (SELECT COUNT(*) FROM mascotas) AS total_mascotas,
    (SELECT COUNT(*) FROM duenos)   AS total_duenos
`);

const stmtTopVets = db.prepare(`
  SELECT u.nombre_completo AS nombre, COUNT(*) AS consultas
  FROM consultas co
  JOIN usuarios u ON co.id_veterinario = u.id_usuario
  WHERE co.fecha BETWEEN ? AND ?
  GROUP BY co.id_veterinario
  ORDER BY consultas DESC
  LIMIT 5
`);

/**
 * GET /api/reportes?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&tipo=citas|consultas|mascotas|resumen
 * Returns data for the given date range.
 */
router.get('/', (req, res) => {
  const { desde, hasta, tipo = 'resumen' } = req.query;

  if (!desde || !hasta) {
    return res.status(400).json({ message: 'Parámetros "desde" y "hasta" son requeridos.' });
  }

  try {
    if (tipo === 'citas') {
      return res.json(stmtCitas.all(desde, hasta));
    }

    if (tipo === 'consultas') {
      return res.json(stmtConsultas.all(desde, hasta));
    }

    if (tipo === 'mascotas') {
      const rows = db.prepare(`
        SELECT m.id_mascota, m.nombre, m.especie, m.raza,
               m.fecha_nacimiento, d.nombre AS dueno, d.telefono, d.email
        FROM mascotas m
        LEFT JOIN duenos d ON m.id_dueno = d.id_dueno
        ORDER BY m.nombre ASC
      `).all();
      return res.json(rows);
    }

    // tipo = 'resumen' — 4 queries instead of 9
    const cStats   = stmtResumenCitas.get(desde, hasta);
    const coTotal  = stmtResumenConsultas.get(desde, hasta).total;
    const pacientes = stmtPacientes.get();
    const topVets  = stmtTopVets.all(desde, hasta);

    return res.json({
      periodo: { desde, hasta },
      citas: {
        total:       cStats.total,
        atendidas:   cStats.atendidas,
        confirmadas: cStats.confirmadas,
        programadas: cStats.programadas,
        canceladas:  cStats.canceladas,
        no_asistio:  cStats.no_asistio,
        por_estado: [
          { estado: 'Atendida',   cantidad: cStats.atendidas },
          { estado: 'Confirmada', cantidad: cStats.confirmadas },
          { estado: 'Programada', cantidad: cStats.programadas },
          { estado: 'Cancelada',  cantidad: cStats.canceladas },
          { estado: 'No asistió', cantidad: cStats.no_asistio },
        ],
      },
      consultas:  { total: coTotal },
      pacientes:  { total_mascotas: pacientes.total_mascotas, total_duenos: pacientes.total_duenos },
      top_veterinarios: topVets,
    });
  } catch (err) {
    console.error('[reportes]', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
