const db = require('./db');

async function initDatabase() {
  try {
    console.log('Verificando estructura de la base de datos...');

    // Verificar y actualizar tabla empleados si es necesario
    console.log('\nVerificando tabla empleados...');
    const empleadosStructure = await db.all("PRAGMA table_info(empleados)");
    console.log('Estructura actual de empleados:', empleadosStructure);

    // Verificar y actualizar tabla reportes si es necesario
    console.log('\nVerificando tabla reportes...');
    const reportesStructure = await db.all("PRAGMA table_info(reportes)");
    console.log('Estructura actual de reportes:', reportesStructure);

    // Verificar y actualizar tabla reporteslog si es necesario
    console.log('\nVerificando tabla reporteslog...');
    const reporteslogStructure = await db.all("PRAGMA table_info(reporteslog)");
    console.log('Estructura actual de reporteslog:', reporteslogStructure);

    // Verificar datos existentes
    console.log('\nVerificando datos existentes...');
    
    console.log('\nEmpleados:');
    const empleados = await db.all("SELECT * FROM empleados");
    console.log('Total empleados:', empleados.length);
    console.log(empleados);

    console.log('\nReportes:');
    const reportes = await db.all("SELECT * FROM reportes");
    console.log('Total reportes:', reportes.length);
    console.log(reportes);

    console.log('\nLogs:');
    const logs = await db.all("SELECT * FROM reporteslog");
    console.log('Total logs:', logs.length);
    console.log(logs);

    // Verificar y actualizar índices si es necesario
    console.log('\nVerificando índices...');
    const indices = await db.all("SELECT * FROM sqlite_master WHERE type='index'");
    console.log('Índices existentes:', indices);

    console.log('\nVerificación completada');
  } catch (error) {
    console.error('Error durante la verificación:', error);
    throw error;
  }
}

initDatabase(); 