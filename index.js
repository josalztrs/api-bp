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

// Loggers por módulo
const log = logger.child('SERVER');

// Rutas
const equipoRoutes = require('./routes/equipo');
const authRoutes = require('./routes/auth');

const app = express();

// ===== MIDDLEWARES =====
app.use(helmet());

// Request logger — registra cada petición HTTP en consola y archivo
app.use(logger.requestLogger());

const whitelist = [
    'http://localhost',      // Origen por defecto de Capacitor en Android
    'capacitor://localhost', // Origen por defecto en iOS
    'http://localhost:8100'  // Para cuando pruebas con el navegador
];

app.use(cors({
    origin: function (origin, callback) {
        // Las APKs a veces no envían 'Origin' en peticiones simples. 
        // Permitir !origin es vital para apps móviles y Postman.
        if (!origin || whitelist.includes(origin)) {
            callback(null, true);
        } else {
            log.warn('CORS bloqueado', { origin });
            callback(new Error('CORS bloqueado para este origen'));
        }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(compression({
    level: 6,
    threshold: 100 // Comprime respuestas > 100 bytes
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting global
const globalLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 40,
    message: 'Demasiadas solicitudes'
});
app.use(globalLimiter);

// ===== INICIALIZAR BASE DE DATOS =====
(async () => {
    const dbReady = await database.initializePool();
    if (dbReady) {
        startServer();
    } else {
        log.error('No se pudo inicializar la base de datos — cerrando proceso');
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
        log.error('Health check falló', error);
        return res.status(503).json({ status: 'down', message: 'Error conectando a BD' });
    }
});

// ===== MANEJO DE ERRORES =====
app.use(errorHandler);

// ===== INICIAR SERVIDOR =====
function startServer() {
    const server = app.listen(config.PORT, '0.0.0.0', () => {
        // Mostrar banner de arranque
        logger.banner(config.PORT, config.DB_PATH);

        // Configurar timeouts
        server.timeout = 30000;              // 30s timeout global
        server.keepAliveTimeout = 65000;     // 65s keep-alive
        server.headersTimeout = 66000;       // 66s headers timeout
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
        log.warn('SIGTERM recibido — iniciando apagado graceful...');
        server.close(async () => {
            await database.closePool();
            log.info('Servidor cerrado correctamente');
            process.exit(0);
        });
    });

    process.on('SIGINT', async () => {
        log.warn('SIGINT recibido — cerrando...');
        server.close(async () => {
            await database.closePool();
            log.info('Servidor cerrado correctamente');
            process.exit(0);
        });
    });
}