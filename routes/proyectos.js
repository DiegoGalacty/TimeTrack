const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET todos los proyectos con horas totales
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, 
        COALESCE(SUM(s.duracion), 0) AS total_segundos
      FROM proyectos p
      LEFT JOIN sesiones s ON s.proyecto_id = p.id
      GROUP BY p.id
      ORDER BY p.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('ERROR PROYECTOS GET /:', err); // ← AGREGADO
    res.status(500).json({ error: err.message });
  }
});

// POST crear proyecto
router.post('/', async (req, res) => {
  try {
    const { nombre, cliente, tarifa_hora, color, estado } = req.body;
    const [result] = await pool.query(
      'INSERT INTO proyectos (nombre, cliente, tarifa_hora, color, estado) VALUES (?,?,?,?,?)',
      [nombre, cliente, tarifa_hora || 25, color || '#c8f060', estado || 'activo']
    );
    res.json({ id: result.insertId, ...req.body });
  } catch (err) {
    console.error('ERROR PROYECTOS POST /:', err); // ← AGREGADO
    res.status(500).json({ error: err.message });
  }
});

// PUT editar proyecto
router.put('/:id', async (req, res) => {
  try {
    const { nombre, cliente, tarifa_hora, color, estado } = req.body;
    await pool.query(
      'UPDATE proyectos SET nombre=?, cliente=?, tarifa_hora=?, color=?, estado=? WHERE id=?',
      [nombre, cliente, tarifa_hora, color, estado, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('ERROR PROYECTOS PUT /:id:', err); // ← AGREGADO
    res.status(500).json({ error: err.message });
  }
});

// DELETE borrar proyecto
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM sesiones WHERE proyecto_id=?', [req.params.id]);
    await pool.query('DELETE FROM proyectos WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('ERROR PROYECTOS DELETE /:id:', err); // ← AGREGADO
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;



