const logger = require('../utils/logger').child('ERROR');
const config = require('../config/config');

function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode || 500;
    const isDev = config.NODE_ENV === 'development';

    logger.error(`${req.method} ${req.originalUrl} — ${err.message}`, err);

    return res.status(statusCode).json({
        error: err.message || 'Error interno del servidor',
        ...(isDev && { details: err.stack }) // Mostrar stack solo en desarrollo
    });
}

module.exports = errorHandler;