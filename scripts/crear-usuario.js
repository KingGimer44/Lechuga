// Script para crear un usuario de prueba
require('dotenv').config();
const db = require('../db/db');
const bcrypt = require('bcrypt');

// Datos del usuario de prueba
const usuario = {
  nombre: 'Admin',
  email: 'admin@example.com',
  password: 'admin123'
};

// Función para crear el usuario
async function crearUsuario() {
  try {
    // Verificar si el usuario ya existe
    db.get('SELECT * FROM usuarios WHERE email = ?', [usuario.email], (err, existente) => {
      if (err) {
        console.error('Error al verificar usuario:', err);
        process.exit(1);
      }

      if (existente) {
        console.log(`El usuario ${usuario.email} ya existe.`);
        process.exit(0);
      }

      // Encriptar la contraseña
      bcrypt.hash(usuario.password, 10, (err, hash) => {
        if (err) {
          console.error('Error al encriptar contraseña:', err);
          process.exit(1);
        }

        // Insertar el usuario
        db.run(
          'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)',
          [usuario.nombre, usuario.email, hash],
          function(err) {
            if (err) {
              console.error('Error al crear usuario:', err);
              process.exit(1);
            }

            console.log(`Usuario ${usuario.email} creado con éxito.`);
            console.log(`ID: ${this.lastID}`);
            process.exit(0);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Ejecutar la función
crearUsuario(); 