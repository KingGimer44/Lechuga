const express = require('express');
const router = express.Router();
const db = require('../db/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const verificarToken = require('../middleware/auth');
const { updatePushToken } = require('../utils/notifications');

// Verificar que la variable de entorno JWT_SECRET esté configurada
if (!process.env.JWT_SECRET) {
  console.error('ERROR: Variable de entorno JWT_SECRET no encontrada');
  console.error('Por favor añade JWT_SECRET en tu archivo .env');
}

// Ruta para iniciar sesión
router.post('/login', (req, res) => {
  const { email, password, push_token } = req.body;

  // Validar que se proporcionen email y password
  if (!email || !password) {
    return res.status(400).json({ error: 'El correo y la contraseña son obligatorios' });
  }

  // Buscar el usuario por email
  db.get('SELECT * FROM usuarios WHERE email = ?', [email], (err, usuario) => {
    if (err) {
      console.error('Error al buscar usuario:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }

    // Verificar si el usuario existe
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Comparar la contraseña
    bcrypt.compare(password, usuario.password, async (err, coincide) => {
      if (err) {
        console.error('Error al comparar contraseñas:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }

      // Si la contraseña no coincide
      if (!coincide) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      // Si se proporcionó un token push, actualizarlo usando el email
      if (push_token) {
        try {
          await updatePushTokenByEmail(email, push_token);
        } catch (error) {
          console.error('Error al actualizar push token:', error);
          // No se devuelve error ya que esto no debería impedir el login
        }
      }

      // Generar token JWT - Convertir BigInt a Number o String para evitar error de serialización
      const token = jwt.sign(
        { 
          id: Number(usuario.idUsuario), 
          nombre: usuario.nombre,
          email: usuario.email,
          role: usuario.role
        }, 
        process.env.JWT_SECRET, 
        { expiresIn: '24h' }
      );

      // Enviar respuesta con token
      res.json({
        mensaje: 'Inicio de sesión exitoso',
        usuario: {
          id: Number(usuario.idUsuario),
          nombre: usuario.nombre,
          email: usuario.email,
          role: usuario.role,
          push_token: usuario.push_token
        },
        token
      });
    });
  });
});

// Ruta para registrar un nuevo usuario
router.post('/registro', (req, res) => {
  const { nombre, email, password, role, push_token } = req.body;

  // Validar datos
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  // Verificar si el email ya está en uso
  db.get('SELECT * FROM usuarios WHERE email = ?', [email], (err, usuario) => {
    if (err) {
      console.error('Error al verificar email:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }

    if (usuario) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Encriptar la contraseña
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        console.error('Error al encriptar contraseña:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }

      // Insertar nuevo usuario
      db.run(
        'INSERT INTO usuarios (nombre, email, password, role, push_token) VALUES (?, ?, ?, ?, ?)',
        [nombre, email, hash, role || 'user', push_token || null],
        function(err) {
          if (err) {
            console.error('Error al registrar usuario:', err);
            return res.status(500).json({ error: 'Error interno del servidor' });
          }

          // Generar token JWT - Convertir BigInt a Number o String para evitar error de serialización
          const token = jwt.sign(
            { 
              id: Number(this.lastID), 
              nombre, 
              email,
              role: role || 'user'
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' }
          );

          // Enviar respuesta
          res.status(201).json({
            mensaje: 'Usuario registrado correctamente',
            usuario: {
              id: Number(this.lastID),
              nombre,
              email,
              role: role || 'user',
              push_token: push_token || null
            },
            token
          });
        }
      );
    });
  });
});

// Función para actualizar el push token usando el email
function updatePushTokenByEmail(email, pushToken) {
  return new Promise((resolve, reject) => {
    if (!email) {
      return reject(new Error('El email es obligatorio'));
    }

    console.log(`Actualizando push token para el usuario con email ${email}`);
    
    db.run('UPDATE usuarios SET push_token = ? WHERE email = ?', [pushToken, email], function(err) {
      if (err) {
        console.error('Error al actualizar push token por email:', err);
        return reject(err);
      }
      
      if (this.changes === 0) {
        console.warn(`No se encontró ningún usuario con el email ${email}`);
        return reject(new Error(`Usuario con email ${email} no encontrado`));
      }
      
      console.log(`Push token actualizado correctamente para el usuario con email ${email}`);
      resolve({ success: true, changes: this.changes });
    });
  });
}

// Ruta para actualizar el token push usando el JWT
router.post('/push-token', verificarToken, async (req, res) => {
  const { push_token } = req.body;
  const userEmail = req.usuario.email;

  if (!push_token) {
    return res.status(400).json({ error: 'El token push es obligatorio' });
  }

  if (!userEmail) {
    return res.status(400).json({ error: 'El email del usuario no está disponible en el token JWT' });
  }

  try {
    // Actualizar usando el email extraído del JWT
    await updatePushTokenByEmail(userEmail, push_token);
    res.json({ 
      mensaje: 'Token push actualizado correctamente',
      email: userEmail
    });
  } catch (error) {
    console.error('Error al actualizar token push:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para actualizar el token push proporcionando el email directamente
router.post('/push-token-by-email', async (req, res) => {
  const { email, push_token } = req.body;

  if (!email || !push_token) {
    return res.status(400).json({ error: 'El email y el token push son obligatorios' });
  }

  try {
    // Verificar si el usuario existe
    db.get('SELECT * FROM usuarios WHERE email = ?', [email], async (err, usuario) => {
      if (err) {
        console.error('Error al buscar usuario:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }

      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Actualizar el token push
      await updatePushTokenByEmail(email, push_token);
      
      res.json({ 
        mensaje: 'Token push actualizado correctamente',
        email: email
      });
    });
  } catch (error) {
    console.error('Error al actualizar token push:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta protegida para verificar el token
router.get('/perfil', verificarToken, (req, res) => {
  res.json({
    mensaje: 'Acceso autorizado',
    usuario: req.usuario
  });
});

module.exports = router; 