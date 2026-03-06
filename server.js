const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: path.join(__dirname, 'html') });
});

// Servir frontend
app.use(express.static(path.join(__dirname, 'html')));

// Rutas
app.use('/api/proyectos', require('./routes/proyectos'));
app.use('/api/sesiones', require('./routes/sesiones'));
app.use('/api/facturas', require('./routes/facturas'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});