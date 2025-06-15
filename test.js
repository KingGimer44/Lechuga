const db = require('./db/db');

async function testDatabase() {
  try {
    console.log('Iniciando prueba de conexión...');

    // Probar consulta simple
    console.log('Probando conexión básica...');
    const result = await db.all('SELECT 1 as test');
    console.log('Conexión exitosa:', result);

    // Mostrar datos existentes
    console.log('\nConsultando datos existentes...');
    
    console.log('\nEmpleados:');
    const empleados = await db.all('SELECT * FROM empleados');
    console.log(empleados);

    console.log('\nReportes:');
    const reportes = await db.all('SELECT * FROM reportes');
    console.log(reportes);

    console.log('\nLogs de reportes:');
    const logs = await db.all('SELECT * FROM reporteslog');
    console.log(logs);

    console.log('\nPrueba completada exitosamente');
  } catch (error) {
    console.error('Error en la prueba:', error);
    console.error('Detalles del error:', {
      message: error.message,
      code: error.code,
      cause: error.cause
    });
  }
}

testDatabase(); 