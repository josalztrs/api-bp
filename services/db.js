const odbc = require('odbc');
const logger = require('../utils/logger').child('DB');
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

        logger.info('Pool ODBC inicializado correctamente', { poolSize: '2-10', timeout: '30s' });
        return true;
    } catch (error) {
        logger.error('Error inicializando Pool ODBC', error);
        return false;
    }
}

async function queryEquipo(sn, deptoscan) {
    if (!pool) throw new Error('Base de datos no disponible');

    const safedSn = `'${String(sn).replace(/'/g, "''")}'`;

    const checkExistencia = `
        SELECT TOP 1 ID, [CODIGO DE ORIGEN]
        FROM [DETALLE POR BIENES]
        WHERE [CODIGO DE ORIGEN] = ${safedSn};
    `;
    
    const existeBien = await pool.query(checkExistencia);

    if (!existeBien || existeBien.length === 0) {
        const hSerial = `'${String(sn).replace(/'/g, "''")}'`;
        const hDeptoEscaneo = `'${String(deptoscan ?? '').replace(/'/g, "''")}'`;
        const insertQuery = `
        INSERT INTO HISTORIAL_ESCANEOS (SERIAL, DPTO_ESCANEO, DETALLES, F_ESCANEO)
        VALUES (${hSerial}, ${hDeptoEscaneo}, 'EQUIPO NO REGISTRADO EN INVENTARIO', Now());
        `;

        try {
            await pool.query(insertQuery);
            logger.warn('Equipo no registrado en inventario', { serial: sn, depto: deptoscan });
        } catch (err) {
            logger.error('Error al guardar historial (equipo no registrado)', err);
        }
        return { error: true, message: "El equipo no está registrado en el inventario" };
    }

    const checkSinAsignacion = `
        SELECT TOP 1 B_DET.ID
        FROM [DETALLE POR BIENES] AS B_DET 
        INNER JOIN BIENES AS B ON B_DET.[BIEN MUEBLE] = B.Id1
        WHERE B_DET.[CODIGO DE ORIGEN] = ${safedSn}
        AND B.TECNOLOGICO = True
        AND NOT EXISTS (
            SELECT 1 
            FROM ASIGNACION AS A 
            WHERE A.CODIGO = B_DET.ID
        );
    `;

    const unassignedData = await pool.query(checkSinAsignacion);

    // Si la consulta devuelve algo, significa que el equipo EXISTE pero NO tiene asignación
    if (unassignedData && unassignedData.length > 0) {
        const hSerial = `'${String(sn).replace(/'/g, "''")}'`;
        const hDeptoEscaneo = `'${String(deptoscan ?? '').replace(/'/g, "''")}'`;
        const insertQuery = `
        INSERT INTO HISTORIAL_ESCANEOS (SERIAL, DPTO_ESCANEO, DETALLES, F_ESCANEO)
        VALUES (${hSerial}, ${hDeptoEscaneo}, 'EQUIPO SIN ASIGNACIÓN VIGENTE', Now());
    `;

    try {
        await pool.query(insertQuery);
        logger.warn('Equipo sin asignación vigente', { serial: sn, depto: deptoscan });
    } catch (err) {
        logger.error('Error al guardar historial (sin asignación)', err);
    }
        return { error: true, message: "Equipo tecnológico sin asignación vigente" };
    }

    //CONSULTA PRINCIPAL (Detalles de la asignación)
    const query = `
        SELECT
            A.F_ASIGNACION AS F_ASIG,
            UBI.UNIDAD AS DEPTO,
            EST.ESTADO,
            T.NOMBRE AS TRAB_NOM,
            C.CARGO AS TRAB_CARGO,
            D.DIVISION AS TRAB_DIV,
            B_DET.[CODIGO DE ORIGEN] AS SERIAL,
            B.[BIEN MUEBLE] AS CATEG_BIEN,
            GR.GRUPO AS CLASE_BIEN,
            M.MARCA,
            B_DET.MODELO,
            B_DET.DESCRIPCION,
            B_DET.PROPIETARIO,
            CD.CONDICION AS TENENCIA
        FROM ((((((((((((((ASIGNACION AS A
            LEFT JOIN [TRABAJADOR] AS T ON A.USUARIO = T.CI)
            LEFT JOIN [CARGO] AS C ON T.CARGO = C.Id)
            LEFT JOIN [DIVISION] AS D ON T.DIVISION = D.Id)
            LEFT JOIN [DETALLE POR BIENES] AS B_DET ON A.CODIGO = B_DET.ID)
            LEFT JOIN [BIENES] AS B ON B_DET.[BIEN MUEBLE] = B.Id1)
            LEFT JOIN [FIRMAS] AS FIR ON A.FIRMA = FIR.Id)
            LEFT JOIN [TRABAJADOR] AS T1 ON FIR.GTE_GRAL = T1.CI)
            LEFT JOIN [TRABAJADOR] AS T2 ON FIR.TIC = T2.CI)
            LEFT JOIN [TRABAJADOR] AS T4 ON D.ENCARGADO = T4.CI)
            LEFT JOIN [UBICACION] AS UBI ON A.UBICACION = UBI.Id)
            LEFT JOIN [ESTADO] AS EST ON A.ESTADO = EST.Id)
            LEFT JOIN [FUNCIÓN] AS F ON T.FUNCION = F.Id)
            LEFT JOIN [MARCAS] AS M ON B_DET.MARCA = M.Id)
            LEFT JOIN [CONDICION] AS CD ON B_DET.CONDICION = CD.CONDICION)
            LEFT JOIN [GRUPO] AS GR ON B.GRUPO = GR.Id
        WHERE B_DET.[CODIGO DE ORIGEN] = ${safedSn}
        AND A.F_ASIGNACION = (
            SELECT MAX(F_ASIGNACION)
            FROM ASIGNACION
            WHERE CODIGO = B_DET.ID
        );
    `;

    const data = await pool.query(query);

    // Si no está en "Sin Asignación" pero tampoco devuelve datos aquí, 
    // el equipo probablemente no existe en la base de datos.
    if (!data || data.length === 0) {
        return { error: true, message: "Equipo no encontrado en el sistema" };
    }

    // 3. REGISTRO EN HISTORIAL (Solo si hay datos)
    const equipo = data[0];
    const hSerial = `'${String(equipo.SERIAL).replace(/'/g, "''")}'`;
    const hPAsign = `'${String(equipo.TRAB_NOM).replace(/'/g, "''")}'`;
    const hDeptoAsign = `'${String(equipo.DEPTO).replace(/'/g, "''")}'`;
    const hDeptoEscaneo = `'${String(deptoscan ?? '').replace(/'/g, "''")}'`;
    const hDetalles = `'${String(equipo.CATEG_BIEN).replace(/'/g, "''")} ${String(equipo.MODELO).replace(/'/g, "''")}'`;

    const insertQuery = `
        INSERT INTO HISTORIAL_ESCANEOS (SERIAL, PERS_ASIGN, DPTO_ASIGN, DPTO_ESCANEO, DETALLES, F_ESCANEO)
        VALUES (${hSerial}, ${hPAsign}, ${hDeptoAsign}, ${hDeptoEscaneo}, ${hDetalles}, Now());
    `;

    try {
        await pool.query(insertQuery);
        logger.info('Escaneo registrado en historial', { serial: sn, responsable: equipo.TRAB_NOM, depto: equipo.DEPTO });
    } catch (err) {
        logger.error('Error al guardar historial de escaneo', err);
    }

    return data;
}

async function queryUbicaciones() {
    if (!pool) throw new Error('Base de datos no disponible');

    // Requerimiento: SELECT * en UBICACION y retornar esos datos
    const query = `
        SELECT *
        FROM [UBICACION];
    `;

    return await pool.query(query);
}

async function checkHealth() {
    if (!pool) throw new Error('Pool no inicializado');
    return await pool.query('SELECT 1');
}

async function closePool() {
    if (pool) {
        await pool.close();
        logger.info('Pool ODBC cerrado correctamente');
    }
}

module.exports = {
    initializePool,
    queryEquipo,
    queryUbicaciones,
    checkHealth,
    closePool
};