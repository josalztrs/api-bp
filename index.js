require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const odbc = require('odbc');
const crypto = require('crypto');

const app = express();


const PORT = process.env.PORT;
const DB_PATH = process.env.DB_PATH;
const DB_TABLE = process.env.DB_TABLE;
const PIN_HASH = process.env.PIN_HASH;
dbReady = false;

// Verificar que existe la ruta de la BD configurada
if (!DB_PATH) {
    console.error("ERROR: No se ha configurado DB_PATH en el archivo .env");
    process.exit(1);
}

// Configuración de middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Inicializa el string de conexión ODBC para el driver de MS Access
const connString = `Driver={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=${DB_PATH};`;

// Control de consultas rápidas por el mismo S/N
const lastRequestTimes = new Map();
const MIN_REQUEST_INTERVAL_MS = 3000;

function generateSHA256(input) {
    return crypto.createHash('sha256').update(input).digest('hex');
}

// Pool de conexiones (recomendado para entornos web y peticiones múltiples)
let pool;
(async () => {
    try {
        pool = await odbc.pool(connString);
        console.log("Pool ODBC inicializado correctamente.");
        dbReady = true;
    } catch (error) {
        dbReady = false;
        console.error("No se pudo iniciar el Pool ODBC. Asegúrate del driver y path correcto.", error);
    }
})();

// Endpoint para buscar por S/N
app.get('/api/equipo/:sn', async (req, res) => {
    try {
        let { sn } = req.params;

        // Validación básica: asegurarse de que no esté vacío y quitar espacios
        if (!sn || sn.trim() === '') {
            return res.status(400).json({ error: "El parámetro S/N no puede estar vacío." });
        }

        sn = sn.trim();

        const requestKey = sn.toLowerCase();
        const lastRequestTime = lastRequestTimes.get(requestKey);
        const now = Date.now();

        if (lastRequestTime && now - lastRequestTime < MIN_REQUEST_INTERVAL_MS) {
            return res.status(400).json({
                error: "Has consultado el mismo artículo en muy poco tiempo. Espera unos segundos e intenta nuevamente."
            });
        }

        lastRequestTimes.set(requestKey, now);

        if (!pool) {
            return res.status(500).json({ error: "El servicio de Base de Datos no está disponible." });
        }

        // El driver ODBC de MS Access no soporta "SQLDescribeParam" para mapear parámetros "?".
        // Por lo tanto, debemos formatear el string SQL manualmente, detectando primero si
        // necesitamos un tipo Numérico o de Texto (String).

        let query;
        const parsedSn = isNaN(Number(sn)) ? sn : Number(sn);

        if (typeof parsedSn === 'number') {
            // El S/N es un número. MS Access da error si le pasamos números envueltos en comillas simples.
            query = `SELECT * FROM ${DB_TABLE} WHERE serial = ${parsedSn}`;
        } else {
            // El S/N contiene letras. Escapamos las comillas nativamente (' => '')
            // y obligamos a enviar la información rodeada de comillas.
            const safedSn = parsedSn.replace(/'/g, "''");
            query = `SELECT * FROM ${DB_TABLE} WHERE serial = '${safedSn}'`;
        }

        // Ejecutar la consulta en la base de datos Access pasándola armada directamente
        const data = await pool.query(query);

        // Si la consulta es exitosa pero no nos regresa registros
        if (!data || data.length === 0) {
            return res.status(404).json({ error: "Equipo no encontrado con ese S/N." });
        }

        // Si se encuentra, devolvemos los resultados
        return res.status(200).json(data);

    } catch (error) {
        console.error("Error al consultar la base de datos con odbc:", error);

        // Devolvemos 500
        return res.status(500).json({
            error: "Error interno del servidor al conectar a la base de datos.",
            details: error.message || "Es posible que el archivo de Access esté bloqueado o no exista."
        });
    }
});

// Endpoint para revisar status 
app.get('/api/status', async (req, res) => {
    if (!pool) {
        return res.status(503).json({
            status: 'down',
            message: 'Servicio de Base de Datos no inicializado'
        });
    }

    try {
        await pool.query('SELECT 1');
        return res.status(200).json({
            status: 'up',
            message: 'Base de datos accesible'
        });
    } catch (error) {
        console.error('DB status check failed:', error);
        return res.status(503).json({
            status: 'down',
            message: 'No se pudo conectar a la base de datos',
            details: error.message
        });
    }
});

// Endpoint para iniciar sesión basado en el PIN de .env
app.get('/api/login/:pin', async (req, res) => {
    const { pin } = req.params;
    if (generateSHA256(pin) == PIN_HASH) {
        return res.status(200).json({
            status: "correct",
            message: 'Inicio de sesión por PIN exitoso'
        });
    } else {
        return res.status(500).json({
            status: "incorrect",
            message: "PIN erróneo. Intente de nuevo."
        });

    };
});
// Arrancar el servidor
app.listen(PORT, () => {
    console.log(`Servidor API en ejecución en el puerto ${PORT}`);
    console.log(`Ruta de la base de datos: ${DB_PATH}`);
});
