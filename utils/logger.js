const winston = require('winston');
const path = require('path');
const config = require('../config/config');

// ═══════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN DE LOGGER PROFESIONAL — API INVENTARIO
// ═══════════════════════════════════════════════════════════════════

const LOG_DIR = path.join(__dirname, '..', 'logs');

// ── Paleta de colores ANSI ──────────────────────────────────────
const colors = {
    reset:   '\x1b[0m',
    bold:    '\x1b[1m',
    dim:     '\x1b[2m',
    // Foreground
    red:     '\x1b[31m',
    green:   '\x1b[32m',
    yellow:  '\x1b[33m',
    blue:    '\x1b[34m',
    magenta: '\x1b[35m',
    cyan:    '\x1b[36m',
    white:   '\x1b[37m',
    gray:    '\x1b[90m',
    // Background
    bgRed:   '\x1b[41m',
    bgYellow:'\x1b[43m',
    bgGreen: '\x1b[42m',
    bgCyan:  '\x1b[46m',
    bgBlue:  '\x1b[44m',
};

// ── Íconos y estilos por nivel ──────────────────────────────────
const levelStyles = {
    error: {
        icon: '✖',
        badge: `${colors.bold}${colors.bgRed}${colors.white} ERROR ${colors.reset}`,
        color: colors.red,
    },
    warn: {
        icon: '⚠',
        badge: `${colors.bold}${colors.bgYellow}${colors.white} WARN  ${colors.reset}`,
        color: colors.yellow,
    },
    info: {
        icon: '●',
        badge: `${colors.bold}${colors.bgGreen}${colors.white} INFO  ${colors.reset}`,
        color: colors.green,
    },
    http: {
        icon: '→',
        badge: `${colors.bold}${colors.bgCyan}${colors.white} HTTP  ${colors.reset}`,
        color: colors.cyan,
    },
    debug: {
        icon: '◌',
        badge: `${colors.bold}${colors.bgBlue}${colors.white} DEBUG ${colors.reset}`,
        color: colors.blue,
    },
};

// ── Formato para consola (colorizado y legible) ─────────────────
const consoleFormat = winston.format.printf(({ level, message, timestamp, module: mod, stack, ...meta }) => {
    const style = levelStyles[level] || levelStyles.info;
    const time = `${colors.gray}${new Date(timestamp).toLocaleTimeString('es-VE', { hour12: false })}${colors.reset}`;
    const moduleTag = mod
        ? `${colors.dim}${colors.magenta}[${mod}]${colors.reset} `
        : '';

    let line = `  ${time}  ${style.badge} ${moduleTag}${style.color}${message}${colors.reset}`;

    // Agregar metadata extra (sin module ni timestamp)
    const metaKeys = Object.keys(meta).filter(k => !['splat'].includes(k));
    if (metaKeys.length > 0) {
        const metaStr = metaKeys
            .map(k => `${colors.gray}${k}=${colors.cyan}${typeof meta[k] === 'object' ? JSON.stringify(meta[k]) : meta[k]}${colors.reset}`)
            .join('  ');
        line += `  ${metaStr}`;
    }

    // Stack trace para errores
    if (stack) {
        const stackLines = stack
            .split('\n')
            .slice(1, 5) // Mostrar solo las primeras 4 líneas del stack
            .map(l => `        ${colors.dim}${colors.red}${l.trim()}${colors.reset}`)
            .join('\n');
        line += `\n${stackLines}`;
    }

    return line;
});

// ── Formato para archivos (JSON estructurado) ───────────────────
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// ── Logger principal ────────────────────────────────────────────
const logger = winston.createLogger({
    level: config.LOG_LEVEL || 'info',
    levels: winston.config.npm.levels,
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.errors({ stack: true })
    ),
    defaultMeta: { service: 'api-inventario' },
    transports: [
        // ── Consola: colorido y legible ──
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp(),
                consoleFormat
            ),
            handleExceptions: true,
            handleRejections: true,
        }),

        // ── Archivo de errores ──
        new winston.transports.File({
            filename: path.join(LOG_DIR, 'error.log'),
            level: 'error',
            format: fileFormat,
            maxsize: 5 * 1024 * 1024,   // 5 MB por archivo
            maxFiles: 5,                 // Mantener 5 archivos
            tailable: true,
        }),

        // ── Archivo combinado ──
        new winston.transports.File({
            filename: path.join(LOG_DIR, 'combined.log'),
            format: fileFormat,
            maxsize: 10 * 1024 * 1024,  // 10 MB por archivo
            maxFiles: 3,                 // Mantener 3 archivos
            tailable: true,
        }),
    ],
    exitOnError: false,
});

// ═══════════════════════════════════════════════════════════════════
//  CHILD LOGGERS — Para contexto por módulo
// ═══════════════════════════════════════════════════════════════════

/**
 * Crea un child logger con el nombre del módulo como contexto.
 * Uso: const log = require('./logger').child('DB');
 *      log.info('Pool inicializado');
 *      → 10:32:15  INFO  [DB] Pool inicializado
 */
logger.child = function (moduleName) {
    const child = Object.create(logger);
    ['error', 'warn', 'info', 'http', 'debug'].forEach(level => {
        child[level] = (message, ...args) => {
            // Si el primer argumento extra es un objeto Error, extraer stack
            if (args[0] instanceof Error) {
                const err = args[0];
                return logger[level]({ message, module: moduleName, stack: err.stack, errorCode: err.code });
            }
            // Si el primer argumento extra es un objeto metadata
            if (args[0] && typeof args[0] === 'object' && !(args[0] instanceof Error)) {
                return logger[level]({ message, module: moduleName, ...args[0] });
            }
            return logger[level]({ message, module: moduleName });
        };
    });
    return child;
};

// ═══════════════════════════════════════════════════════════════════
//  REQUEST LOGGER — Middleware para registrar peticiones HTTP
// ═══════════════════════════════════════════════════════════════════

/**
 * Middleware Express que registra cada petición HTTP entrante
 * con método, URL, status code, y duración.
 */
logger.requestLogger = function () {
    const log = logger.child('HTTP');
    return (req, res, next) => {
        const start = Date.now();

        // Capturar cuando la respuesta termine
        res.on('finish', () => {
            const duration = Date.now() - start;
            const status = res.statusCode;
            const method = req.method;
            const url = req.originalUrl || req.url;

            // Determinar nivel según status code
            let level = 'http';
            if (status >= 500) level = 'error';
            else if (status >= 400) level = 'warn';

            const statusColor = status >= 500 ? '🔴' : status >= 400 ? '🟡' : '🟢';
            const msg = `${method} ${url} ${statusColor} ${status} — ${duration}ms`;

            log[level](msg, { ip: req.ip, duration, statusCode: status });
        });

        next();
    };
};

// ═══════════════════════════════════════════════════════════════════
//  BANNER — Mensaje de arranque del servidor
// ═══════════════════════════════════════════════════════════════════

/**
 * Muestra un banner estilizado cuando el servidor arranca.
 */
logger.banner = function (port, dbPath) {
    const divider = `${colors.cyan}${'═'.repeat(56)}${colors.reset}`;
    const lines = [
        '',
        divider,
        `${colors.bold}${colors.cyan}  ◆  API INVENTARIO  ◆${colors.reset}`,
        divider,
        `${colors.green}  ✔  Servidor${colors.reset}     ${colors.white}http://0.0.0.0:${port}${colors.reset}`,
        `${colors.green}  ✔  Base datos${colors.reset}   ${colors.white}${dbPath}${colors.reset}`,
        `${colors.green}  ✔  Entorno${colors.reset}      ${colors.white}${config.NODE_ENV || 'development'}${colors.reset}`,
        `${colors.green}  ✔  Log level${colors.reset}    ${colors.white}${config.LOG_LEVEL || 'info'}${colors.reset}`,
        divider,
        '',
    ];
    lines.forEach(l => process.stdout.write(l + '\n'));
};

module.exports = logger;