const jwt = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('../utils/logger');

function authMiddleware(req, res, next) {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            logger.warn('Acceso sin token desde IP: ' + req.ip);
            return res.status(401).json({ error: 'Acceso denegado. Token requerido.' });
        }

        const decoded = jwt.verify(token, config.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        logger.warn('Token inválido desde IP: ' + req.ip);
        return res.status(400).json({ error: 'Token inválido o expirado' });
    }
}

module.exports = authMiddleware;