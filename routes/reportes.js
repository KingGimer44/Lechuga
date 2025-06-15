const express = require('express');
const router = express.Router();
const db = require('../db/db');

// Obtener todos los reportes con información del empleado
router.get('/', async (req, res) => {
  try {
    console.log('Obteniendo todos los reportes...');
    const reportes = await db.all(`
      SELECT r.*, e.nombreEmpleado 
      FROM reportes r
      JOIN empleados e ON r.idEmpleado = e.idEmpleado
    `);
    console.log('Reportes encontrados:', reportes);
    res.json(reportes);
  } catch (error) {
    console.error('Error al obtener reportes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener un reporte por ID
router.get('/:id', async (req, res) => {
  try {
    console.log('Obteniendo reporte con ID:', req.params.id);
    const reporte = await db.get(`
      SELECT r.*, e.nombreEmpleado 
      FROM reportes r
      JOIN empleados e ON r.idEmpleado = e.idEmpleado
      WHERE r.idReporte = ?
    `, [req.params.id]);

    if (!reporte) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    console.log('Reporte encontrado:', reporte);
    res.json(reporte);
  } catch (error) {
    console.error('Error al obtener reporte:', error);
    res.status(500).json({ error: error.message });
  }
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

// Crear un nuevo reporte
router.post('/', async (req, res) => {
  try {
    console.log('Datos recibidos para nuevo reporte:', {
      body: req.body,
      headers: req.headers,
      contentType: req.get('content-type'),
      rawBody: req.rawBody
    });

    let { idEmpleado, descripcion, area, estado = 'Sin Revision' } = req.body;

    // Asegurarnos de que los datos sean del tipo correcto
    idEmpleado = parseInt(idEmpleado, 10);
    descripcion = String(descripcion || '').trim();
    area = String(area || '').trim();
    estado = String(estado || 'Sin Revision').trim();

    console.log('Datos procesados:', {
      idEmpleado,
      descripcion,
      area,
      estado,
      tipos: {
        idEmpleado: typeof idEmpleado,
        descripcion: typeof descripcion,
        area: typeof area,
        estado: typeof estado
      },
      valores: {
        idEmpleado: String(idEmpleado),
        descripcion: String(descripcion),
        area: String(area),
        estado: String(estado)
      }
    });

    // Validación más estricta de los campos
    if (isNaN(idEmpleado)) {
      console.error('Error: idEmpleado inválido');
      return res.status(400).json({ 
        error: 'El ID del empleado debe ser un número válido',
        recibido: idEmpleado
      });
    }

    if (!descripcion) {
      console.error('Error: descripcion inválida');
      return res.status(400).json({ 
        error: 'La descripción es requerida y debe ser un texto válido',
        recibido: descripcion
      });
    }

    if (!area) {
      console.error('Error: area inválida');
      return res.status(400).json({ 
        error: 'El área es requerida y debe ser un texto válido',
        recibido: area
      });
    }

    // Verificar si el empleado existe
    const empleado = await db.get('SELECT * FROM empleados WHERE idEmpleado = ?', [idEmpleado]);
    if (!empleado) {
      console.error('Error: Empleado no encontrado');
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    // Preparar la consulta SQL
    const sql = 'INSERT INTO reportes (idEmpleado, descripcion, area, estado, fechaHora) VALUES (?, ?, ?, ?, datetime("now"))';
    const params = [idEmpleado, descripcion, area, estado];
    
    console.log('Ejecutando SQL:', {
      sql,
      params,
      tipos: params.map(p => typeof p)
    });

    // Ejecutar la inserción
    const result = await db.run(sql, params);
    console.log('Resultado de la inserción:', result);

    if (!result.lastID) {
      console.error('Error: No se pudo obtener el ID del reporte insertado');
      return res.status(500).json({ error: 'Error al crear el reporte' });
    }

    // Obtener el reporte recién creado con información del empleado
    const nuevoReporte = await db.get(`
      SELECT r.*, e.nombreEmpleado 
      FROM reportes r
      JOIN empleados e ON r.idEmpleado = e.idEmpleado
      WHERE r.idReporte = ?
    `, [result.lastID]);

    console.log('Nuevo reporte creado:', nuevoReporte);
    
    if (!nuevoReporte) {
      console.error('Error: No se pudo recuperar el reporte recién creado');
      return res.status(500).json({ error: 'Error al recuperar el reporte creado' });
    }
    
    res.status(201).json(nuevoReporte);
  } catch (error) {
    console.error('Error al crear reporte:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar un reporte
router.put('/:id', async (req, res) => {
  try {
    console.log('Actualizando reporte:', req.params.id, req.body);
    const { idEmpleado, descripcion, area, estado } = req.body;

    if (!idEmpleado || !descripcion || !area || !estado) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const result = await db.run(
      'UPDATE reportes SET idEmpleado = ?, descripcion = ?, area = ?, estado = ? WHERE idReporte = ?',
      [idEmpleado, descripcion, area, estado, req.params.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    const reporteActualizado = await db.get(`
      SELECT r.*, e.nombreEmpleado 
      FROM reportes r
      JOIN empleados e ON r.idEmpleado = e.idEmpleado
      WHERE r.idReporte = ?
    `, [req.params.id]);

    console.log('Reporte actualizado:', reporteActualizado);
    res.json(reporteActualizado);
  } catch (error) {
    console.error('Error al actualizar reporte:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un reporte
router.delete('/:id', async (req, res) => {
  try {
    console.log('Eliminando reporte:', req.params.id);
    const result = await db.run('DELETE FROM reportes WHERE idReporte = ?', [req.params.id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }
    
    console.log('Reporte eliminado correctamente');
    res.json({ message: 'Reporte eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar reporte:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 