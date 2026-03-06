const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET facturación proyectada del mes actual por proyecto
router.get('/proyectada', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.id, p.nombre, p.cliente, p.tarifa_hora, p.color,
        COALESCE(SUM(s.duracion), 0) AS segundos_mes
      FROM proyectos p
      LEFT JOIN sesiones s ON s.proyecto_id = p.id
        AND MONTH(s.start_time) = MONTH(NOW())
        AND YEAR(s.start_time) = YEAR(NOW())
      GROUP BY p.id
    `);
    res.json(rows);
  } catch (err) {
    console.error('ERROR FACTURAS GET /proyectada:', err); // ← AGREGADO
    res.status(500).json({ error: err.message });
  }
});

// GET todas las facturas
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM facturas ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error('ERROR FACTURAS GET /:', err); // ← AGREGADO
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;