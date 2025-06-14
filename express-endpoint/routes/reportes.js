const express = require('express');
const router = express.Router();
const db = require('../db/db');

// Obtener todos los reportes
router.get('/', (req, res) => {
  const sql = `
    SELECT r.*, e.nombreEmpleado 
    FROM reportes r
    JOIN empleados e ON r.idEmpleado = e.idEmpleado
  `;
  
  db.all(sql, (err, reportes) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(reportes);
  });
});

// Obtener un reporte por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT r.*, e.nombreEmpleado 
    FROM reportes r
    JOIN empleados e ON r.idEmpleado = e.idEmpleado
    WHERE r.idReporte = ?
  `;
  
  db.get(sql, [id], (err, reporte) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!reporte) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }
    res.json(reporte);
  });
});

// Obtener reportes por empleado
router.get('/empleado/:idEmpleado', (req, res) => {
  const { idEmpleado } = req.params;
  const sql = `
    SELECT r.*, e.nombreEmpleado 
    FROM reportes r
    JOIN empleados e ON r.idEmpleado = e.idEmpleado
    WHERE r.idEmpleado = ?
  `;
  
  db.all(sql, [idEmpleado], (err, reportes) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(reportes);
  });
});

// Filtrar reportes por estado
router.get('/estado/:estado', (req, res) => {
  const { estado } = req.params;
  const sql = `
    SELECT r.*, e.nombreEmpleado 
    FROM reportes r
    JOIN empleados e ON r.idEmpleado = e.idEmpleado
    WHERE r.estado = ?
  `;
  
  db.all(sql, [estado], (err, reportes) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(reportes);
  });
});

// Crear un nuevo reporte
router.post('/', (req, res) => {
  const { idEmpleado, descripcion, area, estado = 'Sin Revision' } = req.body;
  
  if (!idEmpleado || !descripcion || !area) {
    return res.status(400).json({ error: 'idEmpleado, descripcion y area son campos requeridos' });
  }

  // Verificar si empleado existe
  db.get('SELECT * FROM empleados WHERE idEmpleado = ?', [idEmpleado], (err, empleado) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!empleado) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const sql = `
      INSERT INTO reportes (idEmpleado, descripcion, area, estado)
      VALUES (?, ?, ?, ?)
    `;
    
    db.run(sql, [idEmpleado, descripcion, area, estado], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Obtener el reporte creado con el nombre del empleado
      db.get(`
        SELECT r.*, e.nombreEmpleado 
        FROM reportes r
        JOIN empleados e ON r.idEmpleado = e.idEmpleado
        WHERE r.idReporte = ?
      `, [this.lastID], (err, reporte) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json(reporte);
      });
    });
  });
});

// Actualizar un reporte
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { idEmpleado, descripcion, area, estado } = req.body;
  
  if (!idEmpleado || !descripcion || !area || !estado) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  // Verificar si el reporte existe
  db.get('SELECT * FROM reportes WHERE idReporte = ?', [id], (err, reporte) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!reporte) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    // Verificar si el empleado existe
    db.get('SELECT * FROM empleados WHERE idEmpleado = ?', [idEmpleado], (err, empleado) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!empleado) {
        return res.status(404).json({ error: 'Empleado no encontrado' });
      }

      const sql = `
        UPDATE reportes
        SET idEmpleado = ?, descripcion = ?, area = ?, estado = ?
        WHERE idReporte = ?
      `;
      
      db.run(sql, [idEmpleado, descripcion, area, estado, id], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // Obtener el reporte actualizado con el nombre del empleado
        db.get(`
          SELECT r.*, e.nombreEmpleado 
          FROM reportes r
          JOIN empleados e ON r.idEmpleado = e.idEmpleado
          WHERE r.idReporte = ?
        `, [id], (err, reporte) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json(reporte);
        });
      });
    });
  });
});

// Actualizar solo el estado de un reporte
router.patch('/:id/estado', (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  
  if (!estado) {
    return res.status(400).json({ error: 'El estado es requerido' });
  }

  db.run('UPDATE reportes SET estado = ? WHERE idReporte = ?', [estado, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }
    
    // Obtener el reporte actualizado
    db.get(`
      SELECT r.*, e.nombreEmpleado 
      FROM reportes r
      JOIN empleados e ON r.idEmpleado = e.idEmpleado
      WHERE r.idReporte = ?
    `, [id], (err, reporte) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(reporte);
    });
  });
});

// Eliminar un reporte
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  // Verificar si el reporte existe
  db.get('SELECT * FROM reportes WHERE idReporte = ?', [id], (err, reporte) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!reporte) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    // Primero eliminar los logs asociados al reporte
    db.run('DELETE FROM reporteslog WHERE idReporte = ?', [id], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Después eliminar el reporte
      db.run('DELETE FROM reportes WHERE idReporte = ?', [id], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Reporte eliminado exitosamente' });
      });
    });
  });
});

module.exports = router; 