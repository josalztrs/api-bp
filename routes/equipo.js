const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const database = require('../services/db');
const logger = require('../utils/logger');
const { lastRequestTimes, checkRateLimit } = require('../utils/rateLimit');

router.get('/:sn', auth, async (req, res, next) => {
    try {
        let { sn } = req.params;

        // Validar entrada
        const { error } = validate(sn, schemas.sn);
        if (error) {
            return res.status(400).json({
                error: error.details.map(d => d.message).join(', ')
            });
        }

        sn = sn.trim();

        // Rate limiting
        const requestKey = sn.toLowerCase();
        if (!checkRateLimit(requestKey, 'request')) {
            return res.status(429).json({
                status: 'locked',
                error: 'Demasiadas solicitudes. Intenta más tarde.'
            });
        }

        // Query
        const data = await database.queryEquipo(sn);

        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        logger.info(`Equipo encontrado: ${sn}`);
        return res.status(200).json(data);

    } catch (error) {
        logger.error(`Error en /equipo/:sn - ${error.message}`);
        next(error);
    }
});

module.exports = router;