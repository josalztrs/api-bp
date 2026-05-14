const NodeCache = require('node-cache');
const config = require('../config/config');
const logger = require('./logger').child('CACHE');

// Cache con TTL de 5 minutos (300 segundos)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

function getFromCache(key) {
    const value = cache.get(key);
    if (value) {
        logger.debug(`Cache HIT para: ${key}`);
    }
    return value;
}

function setInCache(key, value) {
    cache.set(key, value);
    logger.debug(`Cached: ${key}`);
}

function invalidateCache(key) {
    cache.del(key);
    logger.debug(`Cache invalidado: ${key}`);
}

function clearAllCache() {
    cache.flushAll();
    logger.info('Cache completamente limpiado');
}

// Obtén estadísticas del caché
function getCacheStats() {
    return cache.getStats();
}

module.exports = {
    getFromCache,
    setInCache,
    invalidateCache,
    clearAllCache,
    getCacheStats
};