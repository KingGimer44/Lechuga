const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const empleadosRouter = require('./routes/empleados');
const reportesRouter = require('./routes/reportes');
const reportesLogRouter = require('./routes/reportesLog');

// Verificar que las variables de entorno estén configuradas
if (!process.env.TURSO_CONNECTION_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error('ERROR: Variables de entorno TURSO_CONNECTION_URL y TURSO_AUTH_TOKEN son requeridas.');
  console.error('Por favor crea un archivo .env con las variables necesarias.');
  process.exit(1);
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rutas
app.use('/api/empleados', empleadosRouter);
app.use('/api/reportes', reportesRouter);
app.use('/api/reportes-log', reportesLogRouter);

// Manejador de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

// Manejador de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Error interno del servidor' });
});

// El servidor se inicia en bin/www, no aquí
console.log(`API conectada a la base de datos Turso: ${process.env.TURSO_CONNECTION_URL}`);

module.exports = app;
