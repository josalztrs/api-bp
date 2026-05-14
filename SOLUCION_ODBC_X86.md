# Solucion al problema ODBC en Node x86 (Windows x64 + Office x86)

## Contexto del problema

Tu escenario es:

- Windows x64
- Office x86 (32 bits)
- Node.js x86 (32 bits)
- No puedes cambiar Office ni la arquitectura de Node

Al ejecutar `npm install`, falla la dependencia `odbc` porque ese paquete no siempre ofrece binarios compatibles para `win32-ia32` y suele requerir compilacion nativa compleja.

## Causa raiz (resumen)

La libreria `odbc` del proyecto (`"odbc": "2.5.0"`) es un modulo nativo. En entornos x86 puede fallar por:

- Falta de binario precompilado para `win32-ia32`
- Toolchain de compilacion nativa no compatible
- Dependencias del driver ODBC/ABI de Node no alineadas

En tu restriccion actual, la solucion mas estable es **eliminar dependencia de `odbc`** y usar un acceso a Access que funcione mejor con Office x86.

---

## Ruta recomendada (sin cambiar Office ni Node): usar `node-adodb`

`node-adodb` se apoya en ADO/OLE DB de Windows (via cscript), y en escenarios con Office x86 suele ser mas viable que `odbc` nativo.

### 1) Cambiar dependencias

En la raiz del proyecto:

```powershell
npm uninstall odbc
npm install node-adodb
```

### 2) Verificar prerequisitos del motor Access

Debes tener instalado el componente de Access Database Engine **x86** (normalmente ya viene con Office x86 o puede instalarse por separado).

### 3) Actualizar capa de base de datos

Reemplaza el uso de `odbc.pool(...)` en `services/db.js` por `node-adodb`.

Patron base:

```js
const ADODB = require('node-adodb');

const connection = ADODB.open(
  `Provider=Microsoft.ACE.OLEDB.12.0;Data Source=${config.DB_PATH};Persist Security Info=False;`
);

async function queryEquipo(sn) {
  const query = `SELECT ...`;
  const data = await connection.query(query);
  return data;
}
```

### 4) Ajustar funciones de salud y cierre

- `initializePool()` ya no inicializa pool real; puede validar conexion con una consulta simple.
- `checkHealth()` puede ejecutar `SELECT 1` (o una consulta minima valida para Access).
- `closePool()` puede quedar como no-op si no hay pool persistente.

### 5) Probar localmente

```powershell
npm install
npm start
```

Luego probar:

- `POST /api/v1/auth/login`
- `GET /api/v1/equipo/:sn`
- `GET /api/v1/status`

---

## Alternativas (si no quieres cambiar codigo ahora)

## Opcion B: Servicio puente en otra maquina/proceso

Dejar esta API igual y crear un microservicio aparte (x64) que consulte Access/ODBC, y que tu API x86 consuma por HTTP.

Ventajas:
- No tocas mucho el codigo actual.

Desventajas:
- Mas infraestructura y complejidad operativa.

## Opcion C: Compilar `odbc` manualmente en x86 (no recomendado)

Intentar toolchain nativo (Visual Studio Build Tools + python + node-gyp) para compilar `odbc` en `win32-ia32`.

Desventajas:
- Friccion alta
- Tiempo de soporte alto
- Fragil ante actualizaciones

---

## Recomendacion final

Para tu restriccion actual, la mejor estrategia es:

1. Migrar de `odbc` a `node-adodb`
2. Mantener Node x86 y Office x86 como estan
3. Validar consultas y rendimiento con la cache que ya tiene el proyecto

Es la opcion con menor riesgo y mejor compatibilidad en Windows cuando no puedes cambiar arquitectura.

---

## Checklist de implementacion

- [ ] Quitar `odbc` de `package.json`
- [ ] Instalar `node-adodb`
- [ ] Refactorizar `services/db.js`
- [ ] Probar endpoint de login
- [ ] Probar endpoint de equipo por serial
- [ ] Probar health check
- [ ] Revisar logs (`error.log`, `combined.log`)

