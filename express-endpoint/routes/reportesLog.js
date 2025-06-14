const express = require('express');
const router = express.Router();
const db = require('../db/db');

// Obtener todos los logs de reportes
router.get('/', (req, res) => {
  const sql = `
    SELECT rl.*, r.descripcion as reporteDescripcion
    FROM reporteslog rl
    JOIN reportes r ON rl.idReporte = r.idReporte
    ORDER BY rl.fechaHora DESC
  `;
  
  db.all(sql, (err, logs) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(logs);
  });
});

// Obtener un log específico por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT rl.*, r.descripcion as reporteDescripcion
    FROM reporteslog rl
    JOIN reportes r ON rl.idReporte = r.idReporte
    WHERE rl.idLog = ?
  `;
  
  db.get(sql, [id], (err, log) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!log) {
      return res.status(404).json({ error: 'Log no encontrado' });
    }
    res.json(log);
  });
});

// Obtener logs por ID de reporte
router.get('/reporte/:idReporte', (req, res) => {
  const { idReporte } = req.params;
  const sql = `
    SELECT rl.*, r.descripcion as reporteDescripcion
    FROM reporteslog rl
    JOIN reportes r ON rl.idReporte = r.idReporte
    WHERE rl.idReporte = ?
    ORDER BY rl.fechaHora DESC
  `;
  
  db.all(sql, [idReporte], (err, logs) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(logs);
  });
});

// Filtrar logs por estado
router.get('/estado/:estado', (req, res) => {
  const { estado } = req.params;
  const sql = `
    SELECT rl.*, r.descripcion as reporteDescripcion
    FROM reporteslog rl
    JOIN reportes r ON rl.idReporte = r.idReporte
    WHERE rl.estado = ?
    ORDER BY rl.fechaHora DESC
  `;
  
  db.all(sql, [estado], (err, logs) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(logs);
  });
});

// Agregar un nuevo log manualmente (normalmente se hace a través del trigger)
router.post('/', (req, res) => {
  const { idReporte, estado } = req.body;
  
  if (!idReporte || !estado) {
    return res.status(400).json({ error: 'idReporte y estado son campos requeridos' });
  }

  // Verificar si el reporte existe
  db.get('SELECT * FROM reportes WHERE idReporte = ?', [idReporte], (err, reporte) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!reporte) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    const sql = 'INSERT INTO reporteslog (idReporte, estado) VALUES (?, ?)';
    db.run(sql, [idReporte, estado], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Actualizar también el estado del reporte
      db.run('UPDATE reportes SET estado = ? WHERE idReporte = ?', [estado, idReporte], (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // Obtener el log creado
        db.get(`
          SELECT rl.*, r.descripcion as reporteDescripcion
          FROM reporteslog rl
          JOIN reportes r ON rl.idReporte = r.idReporte
          WHERE rl.idLog = ?
        `, [this.lastID], (err, log) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.status(201).json(log);
        });
      });
    });
  });
});

// Eliminar un log específico
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  // Verificar si el log existe
  db.get('SELECT * FROM reporteslog WHERE idLog = ?', [id], (err, log) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!log) {
      return res.status(404).json({ error: 'Log no encontrado' });
    }

    db.run('DELETE FROM reporteslog WHERE idLog = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Log eliminado exitosamente' });
    });
  });
});

// Eliminar todos los logs de un reporte específico
router.delete('/reporte/:idReporte', (req, res) => {
  const { idReporte } = req.params;
  
  // Verificar si el reporte existe
  db.get('SELECT * FROM reportes WHERE idReporte = ?', [idReporte], (err, reporte) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!reporte) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    db.run('DELETE FROM reporteslog WHERE idReporte = ?', [idReporte], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'No se encontraron logs para este reporte' });
      }
      res.json({ message: `${this.changes} logs eliminados exitosamente` });
    });
  });
});

// Obtener el historial completo de estados para un reporte
router.get('/historial/:idReporte', (req, res) => {
  const { idReporte } = req.params;
  const sql = `
    SELECT rl.*, r.descripcion as reporteDescripcion, e.nombreEmpleado
    FROM reporteslog rl
    JOIN reportes r ON rl.idReporte = r.idReporte
    JOIN empleados e ON r.idEmpleado = e.idEmpleado
    WHERE rl.idReporte = ?
    ORDER BY rl.fechaHora ASC
  `;
  
  db.all(sql, [idReporte], (err, historial) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (historial.length === 0) {
      return res.status(404).json({ error: 'No se encontró historial para este reporte' });
    }
    res.json(historial);
  });
});

module.exports = router; 