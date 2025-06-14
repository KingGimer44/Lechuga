// Cargar variables de entorno primero
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@libsql/client');

// Verificar las variables de entorno
if (!process.env.TURSO_CONNECTION_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error('ERROR: Variables de entorno TURSO_CONNECTION_URL y TURSO_AUTH_TOKEN no encontradas');
  console.error('Asegúrate de crear un archivo .env en la raíz del proyecto');
  process.exit(1);
}

// Conexión a la base de datos Turso
console.log('Intentando conectar a Turso en:', process.env.TURSO_CONNECTION_URL);
const client = createClient({
  url: process.env.TURSO_CONNECTION_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Función para ejecutar consultas select y devolver resultados
async function executeQuery(query, params = []) {
  try {
    const result = await client.execute({ sql: query, args: params });
    return result.rows;
  } catch (error) {
    console.error('Error al ejecutar consulta:', error.message);
    throw error;
  }
}

// Función para ejecutar una consulta que no devuelve resultados
async function executeRun(query, params = []) {
  try {
    const result = await client.execute({ sql: query, args: params });
    return result;
  } catch (error) {
    console.error('Error al ejecutar consulta:', error.message);
    throw error;
  }
}

// Función para obtener un único registro
async function executeGetOne(query, params = []) {
  try {
    const rows = await executeQuery(query, params);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error al obtener registro:', error.message);
    throw error;
  }
}

// Función para inicializar la base de datos con el esquema
async function initDatabase() {
  try {
    console.log('Inicializando esquema de base de datos...');
    
    // Habilitar claves foráneas
    await executeRun('PRAGMA foreign_keys = ON');

    // Tabla empleados
    await executeRun(`CREATE TABLE IF NOT EXISTS empleados (
      idEmpleado INTEGER PRIMARY KEY,
      nombreEmpleado TEXT NOT NULL,
      numero INTEGER NOT NULL,
      fechaIngreso DATE NOT NULL
    )`);

    // Tabla reportes
    await executeRun(`CREATE TABLE IF NOT EXISTS reportes (
      idReporte INTEGER PRIMARY KEY,
      idEmpleado INTEGER NOT NULL,
      descripcion TEXT NOT NULL,
      area TEXT NOT NULL,
      fechaHora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      estado TEXT NOT NULL DEFAULT 'Sin Revision',
      FOREIGN KEY (idEmpleado) REFERENCES empleados(idEmpleado)
    )`);

    // Tabla reporteslog
    await executeRun(`CREATE TABLE IF NOT EXISTS reporteslog (
      idLog INTEGER PRIMARY KEY,
      idReporte INTEGER NOT NULL,
      estado TEXT NOT NULL,
      fechaHora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (idReporte) REFERENCES reportes(idReporte)
    )`);

    // Trigger para inserción en reportes
    await executeRun(`CREATE TRIGGER IF NOT EXISTS reportes_after_insert
      AFTER INSERT ON reportes
      BEGIN
        INSERT INTO reporteslog (idReporte, estado)
        VALUES (NEW.idReporte, NEW.estado);
      END
    `);

    // Trigger para actualización en reportes
    await executeRun(`CREATE TRIGGER IF NOT EXISTS reportes_after_update
      AFTER UPDATE ON reportes
      BEGIN
        INSERT INTO reporteslog (idReporte, estado)
        VALUES (NEW.idReporte, NEW.estado);
      END
    `);

    console.log('Esquema de base de datos inicializado correctamente');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error.message);
  }
}

// Inicializar la base de datos al cargar el módulo
initDatabase();

// Interfaces compatibles con el código existente
module.exports = {
  // Equivalente a db.all de SQLite
  all: (query, params, callback) => {
    // Verificar si params es una función (callback) o un array
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    
    executeQuery(query, params)
      .then(rows => {
        if (typeof callback === 'function') {
          callback(null, rows);
        }
      })
      .catch(err => {
        if (typeof callback === 'function') {
          callback(err, null);
        } else {
          console.error('Error en db.all:', err);
        }
      });
  },
  
  // Equivalente a db.get de SQLite
  get: (query, params, callback) => {
    // Verificar si params es una función (callback) o un array
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    
    executeGetOne(query, params)
      .then(row => {
        if (typeof callback === 'function') {
          callback(null, row);
        }
      })
      .catch(err => {
        if (typeof callback === 'function') {
          callback(err, null);
        } else {
          console.error('Error en db.get:', err);
        }
      });
  },
  
  // Equivalente a db.run de SQLite
  run: (query, params, callback) => {
    // Verificar si params es una función (callback) o un array
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    
    executeRun(query, params)
      .then(result => {
        // Crear un objeto similar al de SQLite para mantener compatibilidad
        if (typeof callback === 'function') {
          const context = {
            lastID: result.lastInsertRowid,
            changes: result.rowsAffected
          };
          callback.call(context, null);
        }
      })
      .catch(err => {
        if (typeof callback === 'function') {
          callback(err);
        } else {
          console.error('Error en db.run:', err);
        }
      });
  }
}; 