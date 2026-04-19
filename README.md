# MS Access API - Node.js

API de solo lectura construida con Node.js, Express y odbc para consultar una base de datos Microsoft Access externa preexistente.

## Requisitos Previos

### Driver de Microsoft Access (64-bits)
Para que `odbc` pueda comunicarse con una base de datos de Microsoft Access (`.accdb` o `.mdb`), necesitas tener instalado el driver de base de datos correspondiente (Microsoft Access Database Engine).

1. Descarga el **Microsoft Access Database Engine 2016 Redistributable** (o más reciente) desde la [página oficial de Microsoft](https://www.microsoft.com/en-us/download/details.aspx?id=54920).
2. Asegúrate de instalar la versión de **64 bits** si estás usando una versión de Node.js de 64 bits. (Si usas Node.js de 32 bits, necesitarás la de 32 bits.)

*Nota: Si tienes Office de 32 bits instalado en tu máquina, la instalación típica puede bloquear la instalación del driver de Access de 64 bits. Si es el caso, instala el driver desde la línea de comandos con el parámetro silencioso, por ejemplo: `AccessDatabaseEngine_X64.exe /quiet`.*

## Configuración y Entorno

Las variables necesarias deben residir en el archivo `.env` del directorio raíz. La aplicación usa `dotenv-safe`, por lo que todas las variables obligatorias deben estar definidas.

Ejemplo de `.env`:

```env
PORT=3000
DB_PATH=C:/ruta/absoluta/a/tu/base_de_datos.accdb
DB_TABLE=NombreTabla
PIN_HASH=PinEncriptadoEnSHA256
JWT_SECRET=una_clave_secreta_segura
MIN_REQUEST_INTERVAL_MS=5000
MIN_QUERY_INTERVAL_MS=3000
```

- **PORT**: Puerto donde escucha el servidor.
- **DB_PATH**: Ruta absoluta del archivo `.accdb` o `.mdb`.
- **DB_TABLE**: Nombre de la tabla en la base de datos donde se buscarán los seriales.
- **PIN_HASH**: Hash SHA256 del PIN válido para login.
- **JWT_SECRET**: Clave secreta para firmar tokens JWT.
- **MIN_REQUEST_INTERVAL_MS**: Tiempo mínimo entre búsquedas del mismo S/N.
- **MIN_QUERY_INTERVAL_MS**: Tiempo mínimo entre intentos de login con PIN.

## Instalación e Inicio

1. Instala dependencias:
   ```bash
   npm install
   ```

2. Inicia el servidor:
   ```bash
   npm start
   ```

## Endpoints disponibles

La API está expuesta bajo el prefijo `/api/v1`.

### 1. Login por PIN

- Método: `POST`
- Ruta: `/api/v1/auth/login`
- Body: JSON

Ejemplo:

```json
{
  "pin": "1234567890"
}
```

Respuesta esperada:

```json
{
  "status": "correct",
  "token": "<JWT_TOKEN>"
}
```

> Nota: según la configuración actual, el PIN debe ser exactamente 10 dígitos.

### 2. Buscar un equipo por S/N

- Método: `GET`
- Ruta: `/api/v1/equipo/:sn`
- Header: `Authorization: Bearer <JWT_TOKEN>`

Ejemplo:

```bash
curl -X GET http://localhost:3000/api/v1/equipo/SYS-9874 \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

Respuesta esperada:

- **200 OK**: Devuelve los datos del equipo.
- **404 Not Found**: Equipo no encontrado.
- **400 Bad Request**: S/N inválido o petición mal formada.
- **401 Unauthorized**: Token faltante o inválido.
- **429 Too Many Requests**: Límite de consultas superado.

### 3. Estado del servicio

- Método: `GET`
- Ruta: `/api/v1/status`

Ejemplo:

```bash
curl http://localhost:3000/api/v1/status
```

Respuesta esperada:

- **200 OK**: `{ "status": "up", "message": "OK" }`
- **503 Service Unavailable**: Si la base de datos no está accesible.

## Consideraciones importantes

- La búsqueda de equipo requiere un token JWT válido obtenido desde `/api/v1/auth/login`.
- No envíes body JSON en la petición `GET /api/v1/equipo/:sn`; el S/N se provee en la URL.
- Si el servidor no arranca, verifica que el archivo `.env` exista y contenga todas las variables necesarias.
- Si usas esta API en un servidor real, considera habilitar CORS solo para los orígenes permitidos.

## Notas adicionales

- La aplicación usa `helmet` para seguridad HTTP básica.
- La aplicación aplica un límite global de peticiones con `express-rate-limit`.
- El servidor comprime las respuestas con `compression`.
- La autenticación se realiza con JWT, por lo tanto el token debe enviarse en el header `Authorization`.
