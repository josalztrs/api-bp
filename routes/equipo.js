const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const database = require('../services/db');
const logger = require('../utils/logger').child('EQUIPO');
const { lastRequestTimes, checkRateLimit } = require('../utils/rateLimit');

router.get('/deptos', auth, async (req, res, next) => {
    try {
        const data = await database.queryUbicaciones();
        logger.info('Ubicaciones consultadas exitosamente', { total: data.length });
        return res.status(200).json(data);
    } catch (error) {
        logger.error('Error consultando ubicaciones', error);
        next(error);
    }
});

router.get('/:sn', auth, async (req, res, next) => {
    try {
        let { sn } = req.params;
        const deptoscan = (req.query?.deptoscan ?? '').toString();

        // Validar entrada
        const { error } = validate(sn, schemas.sn);
        if (error) {
            logger.warn('Validación fallida en búsqueda de equipo', { serial: sn, errors: error.details.map(d => d.message) });
            return res.status(400).json({
                error: error.details.map(d => d.message).join(', ')
            });
        }

        sn = sn.trim();

        // Rate limiting
        const requestKey = sn.toLowerCase();
        if (!checkRateLimit(requestKey, 'request')) {
            logger.warn('Rate limit alcanzado', { serial: sn, ip: req.ip });
            return res.status(429).json({
                status: 'locked',
                error: 'Demasiadas solicitudes. Intenta más tarde.'
            });
        }

        // Query
        const data = await database.queryEquipo(sn, deptoscan);

        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        logger.info('Equipo consultado exitosamente', { serial: sn });
        return res.status(200).json(data);

    } catch (error) {
        logger.error('Error en consulta de equipo', error);
        next(error);
    }
});

module.exports = router;