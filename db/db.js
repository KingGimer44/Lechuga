// Cargar variables de entorno primero
require('dotenv').config();
const { createClient } = require('@libsql/client');

const url = process.env.TURSO_CONNECTION_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

console.log('Intentando conectar a Turso en:', url);

if (!url || !authToken) {
  console.error('Error: TURSO_CONNECTION_URL y TURSO_AUTH_TOKEN son requeridos');
  process.exit(1);
}

// Conexión a la base de datos Turso
const client = createClient({
  url: url,
  authToken: authToken,
  syncUrl: url // Agregar syncUrl para asegurar la sincronización
});

// Función para ejecutar consultas select y devolver resultados
async function executeQuery(query, params = []) {
  try {
    console.log('Ejecutando query:', { query, params });
    const result = await client.execute({ sql: query, args: params });
    console.log('Resultado de query:', result);
    return result.rows;
  } catch (error) {
    console.error('Error al ejecutar consulta:', error.message);
    throw error;
  }
}

// Función para ejecutar una consulta que no devuelve resultados
async function executeRun(query, params = []) {
  try {
    console.log('Ejecutando run:', { query, params });
    const result = await client.execute({ sql: query, args: params });
    console.log('Resultado de run:', result);
    return result;
  } catch (error) {
    console.error('Error al ejecutar consulta:', error.message);
    throw error;
  }
}

// Función para obtener un único registro
async function executeGetOne(query, params = []) {
  try {
    console.log('Ejecutando getOne:', { query, params });
    const rows = await executeQuery(query, params);
    console.log('Resultado de getOne:', rows);
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

    // Tabla usuarios para autenticación
    await executeRun(`CREATE TABLE IF NOT EXISTS usuarios (
      idUsuario INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      push_token TEXT,
      fechaCreacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    // Verificar y agregar columnas si no existen
    try {
      // Verificar si la columna role existe
      const checkRoleColumn = await executeQuery("PRAGMA table_info(usuarios)");
      const roleExists = checkRoleColumn.some(col => col.name === 'role');
      
      if (!roleExists) {
        await executeRun("ALTER TABLE usuarios ADD COLUMN role TEXT DEFAULT 'user'");
        console.log("Columna 'role' agregada a la tabla usuarios");
      }
      
      // Verificar si la columna push_token existe
      const pushTokenExists = checkRoleColumn.some(col => col.name === 'push_token');
      
      if (!pushTokenExists) {
        await executeRun("ALTER TABLE usuarios ADD COLUMN push_token TEXT");
        console.log("Columna 'push_token' agregada a la tabla usuarios");
      }
    } catch (error) {
      console.error('Error al actualizar el esquema:', error.message);
    }

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

    // Verificar la estructura de la tabla
    const tableInfo = await executeQuery("PRAGMA table_info(empleados)");
    console.log('Estructura de la tabla empleados:', tableInfo);

    console.log('Esquema de base de datos inicializado correctamente');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error.message);
    throw error;
  }
}

// Inicializar la base de datos al cargar el módulo
initDatabase().catch(console.error);

const db = {
  async all(sql, params = []) {
    try {
      console.log('db.all - Ejecutando consulta:', { sql, params });
      const result = await client.execute({ sql, args: params });
      console.log('db.all - Resultado:', result);
      
      const rows = result.rows.map(row => {
        const newRow = {};
        for (const [key, value] of Object.entries(row)) {
          newRow[key] = typeof value === 'bigint' ? Number(value) : value;
        }
        return newRow;
      });
      
      console.log('db.all - Filas procesadas:', rows);
      return rows;
    } catch (error) {
      console.error('Error en db.all:', error);
      throw error;
    }
  },

  async get(sql, params = []) {
    try {
      console.log('db.get - Ejecutando consulta:', { sql, params });
      const result = await client.execute({ sql, args: params });
      console.log('db.get - Resultado:', result);
      
      if (result.rows.length === 0) {
        console.log('db.get - No se encontraron resultados');
        return null;
      }
      
      const row = result.rows[0];
      const newRow = {};
      for (const [key, value] of Object.entries(row)) {
        newRow[key] = typeof value === 'bigint' ? Number(value) : value;
      }
      
      console.log('db.get - Fila procesada:', newRow);
      return newRow;
    } catch (error) {
      console.error('Error en db.get:', error);
      throw error;
    }
  },

  async run(sql, params = []) {
    try {
      console.log('db.run - Ejecutando consulta:', { sql, params });
      const result = await client.execute({ sql, args: params });
      console.log('db.run - Resultado:', result);
      
      const response = {
        lastID: Number(result.lastInsertRowid),
        changes: Number(result.rowsAffected)
      };
      
      console.log('db.run - Respuesta procesada:', response);
      return response;
    } catch (error) {
      console.error('Error en db.run:', error);
      throw error;
    }
  }
};

module.exports = db; 