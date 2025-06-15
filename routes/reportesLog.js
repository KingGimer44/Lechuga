const express = require('express');
const router = express.Router();
const db = require('../db/db');

// Obtener todos los logs de reportes
router.get('/', async (req, res) => {
  try {
    console.log('Obteniendo todos los logs de reportes...');
    const logs = await db.all(`
      SELECT l.*, r.descripcion as descripcionReporte, e.nombreEmpleado
      FROM reporteslog l
      JOIN reportes r ON l.idReporte = r.idReporte
      JOIN empleados e ON r.idEmpleado = e.idEmpleado
      ORDER BY l.fechaHora DESC
    `);
    console.log('Logs encontrados:', logs);
    res.json(logs);
  } catch (error) {
    console.error('Error al obtener logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener un log por ID
router.get('/:id', async (req, res) => {
  try {
    console.log('Obteniendo log con ID:', req.params.id);
    const log = await db.get(`
      SELECT l.*, r.descripcion as descripcionReporte, e.nombreEmpleado
      FROM reporteslog l
      JOIN reportes r ON l.idReporte = r.idReporte
      JOIN empleados e ON r.idEmpleado = e.idEmpleado
      WHERE l.idLog = ?
    `, [req.params.id]);

    if (!log) {
      return res.status(404).json({ error: 'Log no encontrado' });
    }

    console.log('Log encontrado:', log);
    res.json(log);
  } catch (error) {
    console.error('Error al obtener log:', error);
    res.status(500).json({ error: error.message });
  }
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

// Crear un nuevo log
router.post('/', async (req, res) => {
  try {
    console.log('Datos recibidos para nuevo log:', {
      body: req.body,
      headers: req.headers,
      contentType: req.get('content-type'),
      rawBody: req.rawBody
    });

    let { idReporte, estado } = req.body;

    // Asegurarnos de que los datos sean del tipo correcto
    idReporte = parseInt(idReporte, 10);
    estado = String(estado || '').trim();

    console.log('Datos procesados:', {
      idReporte,
      estado,
      tipos: {
        idReporte: typeof idReporte,
        estado: typeof estado
      },
      valores: {
        idReporte: String(idReporte),
        estado: String(estado)
      }
    });

    // Validación más estricta de los campos
    if (isNaN(idReporte)) {
      console.error('Error: idReporte inválido');
      return res.status(400).json({ 
        error: 'El ID del reporte debe ser un número válido',
        recibido: idReporte
      });
    }

    if (!estado) {
      console.error('Error: estado inválido');
      return res.status(400).json({ 
        error: 'El estado es requerido y debe ser un texto válido',
        recibido: estado
      });
    }

    // Verificar si el reporte existe
    const reporte = await db.get('SELECT * FROM reportes WHERE idReporte = ?', [idReporte]);
    if (!reporte) {
      console.error('Error: Reporte no encontrado');
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    // Preparar la consulta SQL
    const sql = 'INSERT INTO reporteslog (idReporte, estado, fechaHora) VALUES (?, ?, datetime("now"))';
    const params = [idReporte, estado];
    
    console.log('Ejecutando SQL:', {
      sql,
      params,
      tipos: params.map(p => typeof p)
    });

    // Ejecutar la inserción
    const result = await db.run(sql, params);
    console.log('Resultado de la inserción:', result);

    if (!result.lastID) {
      console.error('Error: No se pudo obtener el ID del log insertado');
      return res.status(500).json({ error: 'Error al crear el log' });
    }

    // Actualizar el estado del reporte
    await db.run(
      'UPDATE reportes SET estado = ? WHERE idReporte = ?',
      [estado, idReporte]
    );

    // Obtener el log recién creado con información del reporte y empleado
    const nuevoLog = await db.get(`
      SELECT l.*, r.descripcion as descripcionReporte, e.nombreEmpleado
      FROM reporteslog l
      JOIN reportes r ON l.idReporte = r.idReporte
      JOIN empleados e ON r.idEmpleado = e.idEmpleado
      WHERE l.idLog = ?
    `, [result.lastID]);

    console.log('Nuevo log creado:', nuevoLog);
    
    if (!nuevoLog) {
      console.error('Error: No se pudo recuperar el log recién creado');
      return res.status(500).json({ error: 'Error al recuperar el log creado' });
    }
    
    res.status(201).json(nuevoLog);
  } catch (error) {
    console.error('Error al crear log:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar un log
router.put('/:id', async (req, res) => {
  try {
    console.log('Actualizando log:', req.params.id, req.body);
    const { idReporte, estado } = req.body;

    if (!idReporte || !estado) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // Verificar si el reporte existe
    const reporte = await db.get('SELECT * FROM reportes WHERE idReporte = ?', [idReporte]);
    if (!reporte) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    const result = await db.run(
      'UPDATE reporteslog SET idReporte = ?, estado = ? WHERE idLog = ?',
      [idReporte, estado, req.params.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Log no encontrado' });
    }

    const logActualizado = await db.get(`
      SELECT l.*, r.descripcion as descripcionReporte, e.nombreEmpleado
      FROM reporteslog l
      JOIN reportes r ON l.idReporte = r.idReporte
      JOIN empleados e ON r.idEmpleado = e.idEmpleado
      WHERE l.idLog = ?
    `, [req.params.id]);

    console.log('Log actualizado:', logActualizado);
    res.json(logActualizado);
  } catch (error) {
    console.error('Error al actualizar log:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un log
router.delete('/:id', async (req, res) => {
  try {
    console.log('Eliminando log:', req.params.id);
    const result = await db.run('DELETE FROM reporteslog WHERE idLog = ?', [req.params.id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Log no encontrado' });
    }
    
    console.log('Log eliminado correctamente');
    res.json({ message: 'Log eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar log:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar todos los logs de un reporte específico
router.delete('/reporte/:idReporte', (req, res) => {
  const { idReporte } = req.params;
  
  db.run('DELETE FROM reporteslog WHERE idReporte = ?', [idReporte], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'No se encontraron logs para este reporte' });
    }
    res.json({ message: 'Logs eliminados correctamente' });
  });
});

module.exports = router; 