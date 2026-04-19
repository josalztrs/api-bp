const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { validate, schemas } = require('../middleware/validation');
const { verifyHash } = require('../utils/hash');
const config = require('../config/config');
const logger = require('../utils/logger');
const { checkRateLimit } = require('../utils/rateLimit');

router.post('/login', async (req, res, next) => {
    try {
        const pin = req.body.pin || req.query.pin; // Soporta body o query

        // Validar
        const { error } = validate(pin, schemas.pin);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        // Rate limiting
        if (!checkRateLimit('login', 'query')) {
            return res.status(429).json({
                error: 'Demasiados intentos de login. Intenta más tarde.'
            });
        }

        // Verificar PIN
        if (verifyHash(pin, config.PIN_HASH)) {
            const token = jwt.sign({ user: 'admin' }, config.JWT_SECRET, { expiresIn: '1h' });
            logger.info('Login exitoso');
            return res.status(200).json({ status: 'correct', token });
        } else {
            logger.warn('Intento de login con PIN incorrecto');
            return res.status(401).json({ status: 'incorrect', error: 'PIN erróneo' });
        }
    } catch (error) {
        logger.error(`Error en login: ${error.message}`);
        next(error);
    }
});

module.exports = router;