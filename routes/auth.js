const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { validate, schemas } = require('../middleware/validation');
const { verifyHash } = require('../utils/hash');
const config = require('../config/config');
const logger = require('../utils/logger').child('AUTH');
const { checkRateLimit } = require('../utils/rateLimit');

router.post('/login', async (req, res, next) => {
    try {
        const pin = req.body?.pin || req.query.pin; // Soporta body o query

        // Validar
        const { error } = validate(pin, schemas.pin);
        if (error) {
            logger.warn('Intento de login con formato inválido', { ip: req.ip });
            return res.status(400).json({ error: error.details[0].message });
        }

        // Rate limiting
        if (!checkRateLimit('login', 'query')) {
            logger.warn('Rate limit de login alcanzado', { ip: req.ip });
            return res.status(429).json({
                error: 'Demasiados intentos de login. Intenta más tarde.'
            });
        }

        // Verificar PIN
        if (verifyHash(pin, config.PIN_HASH)) {
            const token = jwt.sign({ user: 'admin' }, config.JWT_SECRET, { expiresIn: '1h' });
            logger.info('Login exitoso', { ip: req.ip });
            return res.status(200).json({ status: 'correct', token });
        } else {
            logger.warn('Login fallido — PIN incorrecto', { ip: req.ip });
            return res.status(401).json({ status: 'incorrect', error: 'PIN erróneo' });
        }
    } catch (error) {
        logger.error('Error en proceso de login', error);
        next(error);
    }
});

module.exports = router;