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
        query = `SELECT 
    bm.serial,
    bm.observaciones AS bien_observaciones,
    bm.fecha_compra,
    m.nombre_marca,
    d.nombre_dpto AS departamento,
    e.estado_bien AS estado_bien,
    a.fecha_asign,
    a.estado AS asignacion_estado_id,
    p.cedula,
    p.nombre AS empleado_nombre,
    c.nombre_cargo,
    ed.estado_bien AS asignacion_estado
FROM 
    ((((bienes_muebles AS bm 
    INNER JOIN marca AS m ON bm.marca_id = m.id)
    INNER JOIN departamento AS d ON bm.depto_id = d.id)
    INNER JOIN estado AS e ON bm.estado_id = e.id)
    LEFT JOIN (asignaciones AS a 
        LEFT JOIN (personal AS p 
            LEFT JOIN cargo AS c ON p.cargo_id = c.id) 
        ON a.empleado_id = p.id)
    ON bm.serial = a.serial)
    LEFT JOIN estado AS ed ON a.estado = ed.id
WHERE 
    bm.serial = '${parsedSn}';`;
    } else {
        const safedSn = parsedSn.replace(/'/g, "''");
        query = `SELECT 
    bm.serial,
    bm.observaciones AS bien_observaciones,
    bm.fecha_compra,
    m.nombre_marca,
    d.nombre_dpto AS departamento,
    e.estado_bien AS estado_bien,
    a.fecha_asign,
    a.estado AS asignacion_estado_id,
    p.cedula,
    p.nombre AS empleado_nombre,
    c.nombre_cargo,
    ed.estado_bien AS asignacion_estado
FROM 
    (bienes_muebles AS bm
    INNER JOIN marca AS m ON bm.marca_id = m.id)
    INNER JOIN departamento AS d ON bm.depto_id = d.id
    INNER JOIN estado AS e ON bm.estado_id = e.id
    LEFT JOIN asignaciones AS a ON bm.serial = a.serial
    LEFT JOIN personal AS p ON a.empleado_id = p.id
    LEFT JOIN cargo AS c ON p.cargo_id = c.id
    LEFT JOIN estado AS ed ON a.estado = ed.id
WHERE 
    bm.serial = '${safedSn}';`;
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