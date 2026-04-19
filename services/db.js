const odbc = require('odbc');
const logger = require('../utils/logger');
const config = require('../config/config');
const cache = require('../utils/cache');

let pool;

async function initializePool() {
    try {
        const connString = `Driver={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=${config.DB_PATH};`;

        // Configura el pool con opciones de performance
        pool = await odbc.pool(connString, {
            initialSize: 2,      // Conexiones iniciales
            maxSize: 10,         // Máximo de conexiones
            timeout: 30000,      // Timeout en ms
            idleTimeout: 60000,  // Cerrar conexiones inactivas
            reuseConnections: true
        });

        logger.info('Pool ODBC inicializado (size: 2-10, timeout: 30s)');
        return true;
    } catch (error) {
        logger.error('Error inicializando Pool ODBC:', error);
        return false;
    }
}

async function queryEquipo(sn) {
    const cacheKey = `equipo_${sn.toLowerCase()}`;

    // Busca en caché primero
    const cachedData = cache.getFromCache(cacheKey);
    if (cachedData) {
        return cachedData;
    }

    if (!pool) throw new Error('Base de datos no disponible');

    const parsedSn = isNaN(Number(sn)) ? sn : Number(sn);
    let query;

    if (typeof parsedSn === 'number') {
        query = `SELECT * FROM ${config.DB_TABLE} WHERE serial = ${parsedSn}`;
    } else {
        const safedSn = parsedSn.replace(/'/g, "''");
        query = `SELECT * FROM ${config.DB_TABLE} WHERE serial = '${safedSn}'`;
    }

    const data = await pool.query(query);

    // Guarda en caché si hay resultados
    if (data && data.length > 0) {
        cache.setInCache(cacheKey, data);
    }

    return data;
}

async function checkHealth() {
    if (!pool) throw new Error('Pool no inicializado');
    return await pool.query('SELECT 1');
}

async function closePool() {
    if (pool) {
        await pool.close();
        logger.info('Pool ODBC cerrado');
    }
}

module.exports = {
    initializePool,
    queryEquipo,
    checkHealth,
    closePool
};