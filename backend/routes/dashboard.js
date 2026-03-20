const express = require('express');
const db = require('../database');
const router = express.Router();

// GET /api/dashboard?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const desde = req.query.desde || today;
  const hasta = req.query.hasta || today;

  const citasHoyLista = db.prepare(`
    SELECT c.id_cita, c.id_mascota, c.hora, c.motivo, c.estado,
           m.nombre AS mascota, d.nombre AS dueno, u.nombre_completo AS veterinario
    FROM citas c
    LEFT JOIN mascotas m  ON c.id_mascota     = m.id_mascota
    LEFT JOIN duenos   d  ON m.id_dueno        = d.id_dueno
    LEFT JOIN usuarios u  ON c.id_veterinario  = u.id_usuario
    WHERE c.fecha = ?
    ORDER BY c.hora ASC
  `).all(today);

  const get = (sql, ...params) => db.prepare(sql).get(...params).c;

  res.json({
    periodo:             { desde, hasta },
    citas_hoy_lista:     citasHoyLista,
    citas_hoy_count:     citasHoyLista.length,
    // Period-filtered counters
    citas_pendientes:    get('SELECT COUNT(*) AS c FROM citas WHERE fecha BETWEEN ? AND ?', desde, hasta),
    citas_atendidas:     get("SELECT COUNT(*) AS c FROM citas WHERE estado='Atendida'   AND fecha BETWEEN ? AND ?", desde, hasta),
    citas_canceladas:    get("SELECT COUNT(*) AS c FROM citas WHERE estado='Cancelada'  AND fecha BETWEEN ? AND ?", desde, hasta),
    citas_reprogramadas: get("SELECT COUNT(*) AS c FROM citas WHERE estado='Reprogramada' AND fecha BETWEEN ? AND ?", desde, hasta),
    // Global counters (not period-filtered)
    total_pacientes:     get('SELECT COUNT(*) AS c FROM mascotas'),
    total_duenos:        get('SELECT COUNT(*) AS c FROM duenos'),
    consultas_hoy_count: get('SELECT COUNT(*) AS c FROM consultas WHERE fecha=?', today),
    consultas_total:     get('SELECT COUNT(*) AS c FROM consultas WHERE fecha BETWEEN ? AND ?', desde, hasta),
  });
});

module.exports = router;
