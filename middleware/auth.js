const jwt = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('../utils/logger').child('AUTH');

function authMiddleware(req, res, next) {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            logger.warn('Acceso denegado — sin token', { ip: req.ip, url: req.originalUrl });
            return res.status(401).json({ error: 'Acceso denegado. Token requerido.' });
        }

        const decoded = jwt.verify(token, config.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        logger.warn('Token inválido o expirado', { ip: req.ip, url: req.originalUrl });
        return res.status(400).json({ error: 'Token inválido o expirado' });
    }
}

module.exports = authMiddleware;