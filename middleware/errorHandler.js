const logger = require('../utils/logger');
const config = require('../config/config');

function errorHandler(err, req, res, next) {
    logger.error('Error no capturado:', err);

    const isDev = config.NODE_ENV === 'development';
    const statusCode = err.statusCode || 500;

    return res.status(statusCode).json({
        error: err.message || 'Error interno del servidor',
        ...(isDev && { details: err.stack }) // Mostrar stack solo en desarrollo
    });
}

module.exports = errorHandler;