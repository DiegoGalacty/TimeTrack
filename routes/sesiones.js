const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET sesiones de un proyecto
router.get('/proyecto/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM sesiones WHERE proyecto_id=? ORDER BY start_time DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('ERROR SESIONES GET /proyecto/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET horas semanales por proyecto
router.get('/semana', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT proyecto_id, SUM(duracion) AS total_segundos
      FROM sesiones
      WHERE start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY proyecto_id
    `);
    res.json(rows);
  } catch (err) {
    console.error('ERROR SESIONES GET /semana:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET horas de hoy
router.get('/hoy', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT proyecto_id, SUM(duracion) AS total_segundos
      FROM sesiones
      WHERE DATE(start_time) = CURDATE()
      GROUP BY proyecto_id
    `);
    res.json(rows);
  } catch (err) {
    console.error('ERROR SESIONES GET /hoy:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET sesiones en un rango de fechas (para reportes)
// Query params: ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/rango', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    if (!desde || !hasta) {
      return res.status(400).json({ error: 'Parámetros desde y hasta son requeridos' });
    }
    const [rows] = await pool.query(`
      SELECT s.*, p.nombre AS proyecto_nombre, p.cliente, p.tarifa_hora, p.color
      FROM sesiones s
      JOIN proyectos p ON p.id = s.proyecto_id
      WHERE DATE(s.start_time) BETWEEN ? AND ?
      ORDER BY s.start_time ASC
    `, [desde, hasta]);
    res.json(rows);
  } catch (err) {
    console.error('ERROR SESIONES GET /rango:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST guardar sesión al hacer Stop
router.post('/', async (req, res) => {
  try {
    const { proyecto_id, start_time, end_time, duracion, notas } = req.body;
    const [result] = await pool.query(
      'INSERT INTO sesiones (proyecto_id, start_time, end_time, duracion, notas) VALUES (?,?,?,?,?)',
      [proyecto_id, start_time, end_time, duracion, notas || '']
    );
    res.json({ id: result.insertId });
  } catch (err) {
    console.error('ERROR SESIONES POST /:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;