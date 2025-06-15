const axios = require('axios');
const db = require('../db/db');

/**
 * Envía una notificación push a todos los usuarios con el rol de administrador
 * @param {string} title - Título de la notificación
 * @param {string} body - Cuerpo de la notificación
 * @param {Object} data - Datos adicionales para la notificación (opcional)
 * @param {Object} actionUser - Usuario que realizó la acción (opcional)
 * @returns {Promise<Object>} - Resultado de la operación
 */
async function sendAdminNotification(title, body, data = {}, actionUser = null) {
  return new Promise((resolve, reject) => {
    // Buscar todos los usuarios administradores con token push
    db.all('SELECT * FROM usuarios WHERE role = ? AND push_token IS NOT NULL', ['admin'], async (err, usuarios) => {
      if (err) {
        console.error('Error al buscar administradores:', err);
        return reject(err);
      }

      // Si no hay usuarios administradores con token, terminar
      if (!usuarios || usuarios.length === 0) {
        console.log('No hay administradores con token de notificación');
        return resolve({ success: false, message: 'No hay administradores con token' });
      }

      console.log(`Enviando notificación a ${usuarios.length} administradores...`);
      
      // Incluir información del usuario que realizó la acción
      let actionUserInfo = null;
      if (actionUser) {
        actionUserInfo = {
          id: actionUser.id,
          nombre: actionUser.nombre,
          email: actionUser.email,
          role: actionUser.role
        };
        
        // Modificar el título y el cuerpo para incluir el nombre del usuario
        if (actionUser.nombre) {
          title = `${title} por ${actionUser.nombre}`;
          // Añadir el nombre del usuario al cuerpo solo si no está ya incluido
          if (!body.includes(actionUser.nombre)) {
            body = `${body} (acción realizada por: ${actionUser.nombre})`;
          }
        }
      }
      
      // Enviar notificación a cada administrador
      const promises = usuarios.map(usuario => {
        return sendPushNotification(usuario.push_token, title, body, {
          ...data,
          timestamp: new Date().toISOString(),
          targetUserId: usuario.idUsuario,
          targetUserName: usuario.nombre,
          actionUser: actionUserInfo
        });
      });

      try {
        const results = await Promise.allSettled(promises);
        
        // Contar éxitos y fallos
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        console.log(`Notificaciones enviadas: ${successful} exitosas, ${failed} fallidas`);
        
        // Extraer los errores para debugging
        const errors = results
          .filter(r => r.status === 'rejected')
          .map(r => r.reason?.message || 'Error desconocido');
        
        if (errors.length > 0) {
          console.error('Errores al enviar notificaciones:', errors);
        }
        
        resolve({ 
          success: successful > 0,
          results: {
            total: results.length,
            successful,
            failed,
            errors: errors.length > 0 ? errors : undefined
          }
        });
      } catch (error) {
        console.error('Error al enviar notificaciones:', error);
        reject(error);
      }
    });
  });
}

/**
 * Envía una notificación push a un token específico
 * @param {string} token - Token de dispositivo Expo
 * @param {string} title - Título de la notificación
 * @param {string} body - Cuerpo de la notificación
 * @param {Object} data - Datos adicionales para la notificación (opcional)
 * @returns {Promise<Object>} - Respuesta de la API de Expo
 */
async function sendPushNotification(token, title, body, data = {}) {
  // Validar el token
  if (!token || typeof token !== 'string' || token.trim() === '') {
    console.error('Token push inválido:', token);
    return Promise.reject(new Error('Token push inválido'));
  }

  const message = {
    to: token,
    sound: 'default',
    title,
    body,
    data: {
      ...data,
      _displayInForeground: true
    },
    priority: 'high'
  };

  try {
    console.log(`Enviando notificación a token: ${token.substring(0, 10)}...`);
    
    const response = await axios.post('https://exp.host/--/api/v2/push/send', message, {
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });
    
    if (response.data.errors && response.data.errors.length > 0) {
      console.error('Error en respuesta de Expo Push API:', response.data.errors);
      return Promise.reject(new Error(`Error en Expo Push API: ${response.data.errors[0]?.message || 'Error desconocido'}`));
    }
    
    console.log('Notificación enviada correctamente');
    return response.data;
  } catch (error) {
    console.error('Error enviando notificación push:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Actualiza el token push de un usuario
 * @param {number} userId - ID del usuario
 * @param {string} token - Token push de Expo
 * @returns {Promise<Object>} - Resultado de la operación
 */
function updatePushToken(userId, token) {
  return new Promise((resolve, reject) => {
    if (!userId) {
      return reject(new Error('ID de usuario es requerido'));
    }
    
    if (!token) {
      console.log(`Eliminando token push para el usuario ${userId}`);
      db.run('UPDATE usuarios SET push_token = NULL WHERE idUsuario = ?', [userId], function(err) {
        if (err) {
          console.error('Error al eliminar token push:', err);
          return reject(err);
        }
        resolve({ success: true, changes: this.changes, action: 'token_removed' });
      });
      return;
    }
    
    console.log(`Actualizando token push para el usuario ${userId}: ${token.substring(0, 10)}...`);
    
    db.run('UPDATE usuarios SET push_token = ? WHERE idUsuario = ?', [token, userId], function(err) {
      if (err) {
        console.error('Error al actualizar token push:', err);
        return reject(err);
      }
      
      if (this.changes === 0) {
        console.warn(`No se actualizó ningún usuario con ID ${userId}`);
      } else {
        console.log(`Token push actualizado correctamente para el usuario ${userId}`);
      }
      
      resolve({ success: true, changes: this.changes, action: 'token_updated' });
    });
  });
}

/**
 * Envía una notificación a un usuario específico por su ID
 * @param {number} userId - ID del usuario
 * @param {string} title - Título de la notificación
 * @param {string} body - Cuerpo de la notificación
 * @param {Object} data - Datos adicionales para la notificación (opcional)
 * @param {Object} actionUser - Usuario que realizó la acción (opcional)
 * @returns {Promise<Object>} - Resultado de la operación
 */
function sendUserNotification(userId, title, body, data = {}, actionUser = null) {
  return new Promise((resolve, reject) => {
    if (!userId) {
      return reject(new Error('ID de usuario es requerido'));
    }
    
    db.get('SELECT * FROM usuarios WHERE idUsuario = ?', [userId], async (err, usuario) => {
      if (err) {
        console.error('Error al buscar usuario:', err);
        return reject(err);
      }
      
      if (!usuario) {
        return reject(new Error(`Usuario con ID ${userId} no encontrado`));
      }
      
      if (!usuario.push_token) {
        console.log(`Usuario ${usuario.nombre} (ID: ${userId}) no tiene token push registrado`);
        return resolve({ success: false, message: 'Usuario sin token push' });
      }
      
      // Incluir información del usuario que realizó la acción
      let actionUserInfo = null;
      if (actionUser) {
        actionUserInfo = {
          id: actionUser.id,
          nombre: actionUser.nombre,
          email: actionUser.email,
          role: actionUser.role
        };
        
        // Modificar el título y el cuerpo para incluir el nombre del usuario
        if (actionUser.nombre) {
          title = `${title} por ${actionUser.nombre}`;
          // Añadir el nombre del usuario al cuerpo solo si no está ya incluido
          if (!body.includes(actionUser.nombre)) {
            body = `${body} (acción realizada por: ${actionUser.nombre})`;
          }
        }
      }
      
      try {
        const result = await sendPushNotification(usuario.push_token, title, body, {
          ...data,
          timestamp: new Date().toISOString(),
          targetUserId: usuario.idUsuario,
          targetUserName: usuario.nombre,
          actionUser: actionUserInfo
        });
        
        resolve({ success: true, result });
      } catch (error) {
        console.error(`Error al enviar notificación al usuario ${usuario.nombre} (ID: ${userId}):`, error);
        reject(error);
      }
    });
  });
}

module.exports = {
  sendAdminNotification,
  sendPushNotification,
  updatePushToken,
  sendUserNotification
}; 