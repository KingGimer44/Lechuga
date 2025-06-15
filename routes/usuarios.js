const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { sendAdminNotification } = require('../utils/notifications');

// Obtener todos los usuarios
router.get('/', (req, res) => {
    db.all('SELECT * FROM usuarios WHERE role = ? AND push_token IS NOT NULL', ['admin'], async (err, empleados) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(empleados);
    });
});

module.exports = router;