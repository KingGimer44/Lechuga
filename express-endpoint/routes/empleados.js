const express = require('express');
const router = express.Router();
const db = require('../db/db');

// Obtener todos los empleados
router.get('/', (req, res) => {
  db.all('SELECT * FROM empleados', (err, empleados) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(empleados);
  });
});

// Obtener un empleado por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM empleados WHERE idEmpleado = ?', [id], (err, empleado) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!empleado) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    res.json(empleado);
  });
});

// Crear un nuevo empleado
router.post('/', (req, res) => {
  const { nombreEmpleado, numero, fechaIngreso } = req.body;
  
  if (!nombreEmpleado || !numero || !fechaIngreso) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  const sql = 'INSERT INTO empleados (nombreEmpleado, numero, fechaIngreso) VALUES (?, ?, ?)';
  db.run(sql, [nombreEmpleado, numero, fechaIngreso], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({
      idEmpleado: this.lastID,
      nombreEmpleado,
      numero,
      fechaIngreso
    });
  });
});

// Actualizar un empleado
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nombreEmpleado, numero, fechaIngreso } = req.body;
  
  if (!nombreEmpleado || !numero || !fechaIngreso) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  const sql = 'UPDATE empleados SET nombreEmpleado = ?, numero = ?, fechaIngreso = ? WHERE idEmpleado = ?';
  db.run(sql, [nombreEmpleado, numero, fechaIngreso, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    res.json({
      idEmpleado: parseInt(id),
      nombreEmpleado,
      numero,
      fechaIngreso
    });
  });
});

// Eliminar un empleado
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM empleados WHERE idEmpleado = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    res.json({ message: 'Empleado eliminado exitosamente' });
  });
});

module.exports = router;





