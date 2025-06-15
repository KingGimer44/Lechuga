const express = require('express');
const router = express.Router();
const db = require('../db/db');

// Obtener todos los empleados
router.get('/', async (req, res) => {
  try {
    const empleados = await db.all('SELECT * FROM empleados');
    res.json(empleados);
  } catch (error) {
    console.error('Error al obtener empleados:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener un empleado por ID
router.get('/:id', async (req, res) => {
  try {
    const empleado = await db.get('SELECT * FROM empleados WHERE idEmpleado = ?', [req.params.id]);
    if (!empleado) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    res.json(empleado);
  } catch (error) {
    console.error('Error al obtener empleado:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear un nuevo empleado
router.post('/', async (req, res) => {
  try {
    console.log('Datos recibidos en POST /empleados:', {
      body: req.body,
      headers: req.headers,
      contentType: req.get('content-type'),
      rawBody: req.rawBody
    });
    
    // Validar que el body sea un objeto
    if (typeof req.body !== 'object' || req.body === null) {
      console.error('Error: El body no es un objeto válido');
      return res.status(400).json({ 
        error: 'Datos inválidos',
        recibido: req.body
      });
    }
    
    let { nombreEmpleado, numero, fechaIngreso } = req.body;
    
    // Asegurarnos de que los datos sean del tipo correcto
    nombreEmpleado = String(nombreEmpleado || '').trim();
    numero = parseInt(numero, 10);
    fechaIngreso = String(fechaIngreso || '').trim();
    
    console.log('Datos procesados:', {
      nombreEmpleado,
      numero,
      fechaIngreso,
      tipos: {
        nombreEmpleado: typeof nombreEmpleado,
        numero: typeof numero,
        fechaIngreso: typeof fechaIngreso
      },
      valores: {
        nombreEmpleado: String(nombreEmpleado),
        numero: String(numero),
        fechaIngreso: String(fechaIngreso)
      }
    });

    // Validación más estricta de los campos
    if (!nombreEmpleado) {
      console.error('Error: nombreEmpleado inválido');
      return res.status(400).json({ 
        error: 'El nombre del empleado es requerido y debe ser un texto válido',
        recibido: nombreEmpleado
      });
    }

    if (isNaN(numero)) {
      console.error('Error: numero inválido');
      return res.status(400).json({ 
        error: 'El número debe ser un valor numérico válido',
        recibido: numero
      });
    }

    if (!fechaIngreso || !Date.parse(fechaIngreso)) {
      console.error('Error: fechaIngreso inválida');
      return res.status(400).json({ 
        error: 'La fecha de ingreso debe ser una fecha válida',
        recibido: fechaIngreso
      });
    }

    // Verificar si el número ya existe
    const empleadoExistente = await db.get('SELECT * FROM empleados WHERE numero = ?', [numero]);
    if (empleadoExistente) {
      return res.status(400).json({ error: 'Ya existe un empleado con ese número' });
    }

    // Preparar la consulta SQL
    const sql = 'INSERT INTO empleados (nombreEmpleado, numero, fechaIngreso) VALUES (?, ?, ?)';
    const params = [nombreEmpleado, numero, fechaIngreso];
    
    console.log('Ejecutando SQL:', {
      sql,
      params,
      tipos: params.map(p => typeof p)
    });

    // Ejecutar la inserción
    const result = await db.run(sql, params);
    console.log('Resultado de la inserción:', result);

    if (!result.lastID) {
      console.error('Error: No se pudo obtener el ID del empleado insertado');
      return res.status(500).json({ error: 'Error al crear el empleado' });
    }

    // Obtener el empleado recién creado
    const nuevoEmpleado = await db.get('SELECT * FROM empleados WHERE idEmpleado = ?', [result.lastID]);
    console.log('Nuevo empleado creado:', nuevoEmpleado);
    
    if (!nuevoEmpleado) {
      console.error('Error: No se pudo recuperar el empleado recién creado');
      return res.status(500).json({ error: 'Error al recuperar el empleado creado' });
    }
    
    res.status(201).json(nuevoEmpleado);
  } catch (error) {
    console.error('Error detallado al crear empleado:', {
      mensaje: error.message,
      codigo: error.code,
      causa: error.cause,
      stack: error.stack
    });
    res.status(500).json({ error: error.message });
  }
});

// Actualizar un empleado
router.put('/:id', async (req, res) => {
  try {
    const { nombreEmpleado, numero, fechaIngreso } = req.body;
    
    if (!nombreEmpleado || !numero || !fechaIngreso) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const result = await db.run(
      'UPDATE empleados SET nombreEmpleado = ?, numero = ?, fechaIngreso = ? WHERE idEmpleado = ?',
      [nombreEmpleado, numero, fechaIngreso, req.params.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const empleadoActualizado = await db.get('SELECT * FROM empleados WHERE idEmpleado = ?', [req.params.id]);
    res.json(empleadoActualizado);
  } catch (error) {
    console.error('Error al actualizar empleado:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un empleado
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.run('DELETE FROM empleados WHERE idEmpleado = ?', [req.params.id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    
    res.json({ message: 'Empleado eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar empleado:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;