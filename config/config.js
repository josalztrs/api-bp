require('dotenv-safe').config();

module.exports = {
    PORT: process.env.PORT,
    DB_PATH: process.env.DB_PATH,
    DB_TABLE: process.env.DB_TABLE,
    PIN_HASH: process.env.PIN_HASH,
    JWT_SECRET: process.env.JWT_SECRET,
    MIN_REQUEST_INTERVAL_MS: parseInt(process.env.MIN_REQUEST_INTERVAL_MS),
    MIN_QUERY_INTERVAL_MS: parseInt(process.env.MIN_QUERY_INTERVAL_MS)
};