// Por si acaso la puedo usa

const config = require('../config/config');

const lastRequestTimes = new Map();

function checkRateLimit(key, type = 'request') {
    const now = Date.now();
    const interval = type === 'query' ? config.MIN_QUERY_INTERVAL_MS : config.MIN_REQUEST_INTERVAL_MS;
    const lastTime = lastRequestTimes.get(key);

    if (lastTime && now - lastTime < interval) {
        return false;
    }

    lastRequestTimes.set(key, now);
    return true;
}

module.exports = {
    lastRequestTimes,
    checkRateLimit
};