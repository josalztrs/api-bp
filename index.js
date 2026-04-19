require('dotenv-safe').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const config = require('./config/config');
const logger = require('./utils/logger');
const database = require('./services/db');
const errorHandler = require('./middleware/errorHandler');

// Rutas
const equipoRoutes = require('./routes/equipo');
const authRoutes = require('./routes/auth');

const app = express();

// ===== MIDDLEWARES =====
app.use(helmet());

// OJO ESTO SE TIENE QUE MODIFICAR CUANDO SE ALOJE EN UN SERVER
// app.use(cors({
// origin: config.ALLOWED_ORIGINS,
// credentials: true
// }));
app.use(compression({
    level: 6,
    threshold: 100 // Comprime respuestas > 100 bytes
}));
app.use(express.json());

// Rate limiting global
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Demasiadas solicitudes'
});
app.use(globalLimiter);

// ===== INICIALIZAR BASE DE DATOS =====
(async () => {
    const dbReady = await database.initializePool();
    if (dbReady) {
        startServer();
    } else {
        logger.error('No se pudo inicializar la base de datos');
        process.exit(1);
    }
})();

// ===== RUTAS =====
app.use('/api/v1/equipo', equipoRoutes);
app.use('/api/v1/auth', authRoutes);
app.get('/api/v1/status', async (req, res, next) => {
    try {
        await database.checkHealth();
        return res.status(200).json({ status: 'up', message: 'OK' });
    } catch (error) {
        logger.error('Health check failed:', error);
        return res.status(503).json({ status: 'down', message: 'Error conectando a BD' });
    }
});

// ===== MANEJO DE ERRORES =====
app.use(errorHandler);

// ===== INICIAR SERVIDOR =====
function startServer() {
    const server = app.listen(config.PORT, () => {
        logger.info(`Servidor API en puerto ${config.PORT}`);
        logger.info(`Base de datos: ${config.DB_PATH}`);
        // Configurar timeouts
        server.timeout = 30000;              // 30s timeout global
        server.keepAliveTimeout = 65000;     // 65s keep-alive
        server.headersTimeout = 66000;       // 66s headers timeout
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
        logger.info('SIGTERM recibido, cerrando servidor...');
        server.close(async () => {
            await database.closePool();
            process.exit(0);
        });
    });
}