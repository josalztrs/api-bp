# MS Access API - Node.js

API de solo lectura construida con Node.js, Express y odbc para consultar una base de datos Microsoft Access externa preexistente.

## Requisitos Previos

### Driver de Microsoft Access (64-bits)
Para que `odbc` pueda comunicarse con una base de datos de Microsoft Access (`.accdb` o `.mdb`), necesitas tener instalado el driver de base de datos correspondiente (Microsoft Access Database Engine).

1. Descarga el **Microsoft Access Database Engine 2016 Redistributable** (o más reciente) desde la [página oficial de Microsoft](https://www.microsoft.com/en-us/download/details.aspx?id=54920).
2. Asegúrate de instalar la versión de **64 bits** (generalmente `AccessDatabaseEngine_X64.exe`) si estás usando una versión de Node.js de 64 bits. (Si usas Node.js de 32 bits, necesitarás la de 32 bits, pero 64 bits es el estándar de Node hoy en día).

*Nota: Si tienes Office de 32 bits instalado en tu máquina, la instalación típica bloquea la instalación del driver de Access de 64 bits. Si es el caso, debes instalar el driver desde la línea de comandos con el parámetro silencioso (ej: `AccessDatabaseEngine_X64.exe /quiet`).*

## Configuración y Entorno

Las variables de configuración necesarias deben residir en el archivo `.env`. Este archivo lo encontrarás en el directorio raíz. En caso de no existir o querer configurar variables distintas a las del paquete proveído, puedes crear este archivo o modificar dichas variables:

```env
PORT=3000
DB_PATH=C:/ruta/absoluta/a/tu/base_de_datos.accdb
DB_TABLE=NombreTabla
```

- **DB_PATH**: Es **MANDATORIO** poner aquí la **ruta absoluta** donde reside el archivo `.accdb` en el sistema (fuera de la carpeta del proyecto).

## Instalación e Inicio

1. Ejecuta la instalación de paquetes con npm:
   ```bash
   npm install
   ```

2. Inicializa el servidor backend:
   ```bash
   npm start
   ```

## Uso de la API

Inicia la consulta directamente a la URL que apunta a la API. Esta API se limita solo a procesar métodos `GET`:

### Consultar un Equipo por Número de Serie (S/N)

Puedes consultar un equipo pasando el número de serie (`S/N`) directamente en como parámetro final de la URL al endpoint:

```
GET http://localhost:<PORT>/api/equipo/<TU_NUMERO_DE_SERIE>
```

**Ejemplo de Petición:**
Si tu equipo tiene el S/N "SYS-9874", y tu servicio está levantado en el puerto 3000:
```
GET http://localhost:3000/api/equipo/SYS-9874
```

#### Respuestas y Estado:
- **200 OK**: Devuelve en formato JSON un array que contiene el/los objetos que correspondan y coincidan con el query del S/N pasado.
- **404 Not Found**: Si la base de datos es consultada correctamente pero ese número de S/N no pertenece a los registros del sistema.
- **400 Bad Request**: Si el parámetro `sn` de alguna forma ha pasado en blanco a la URL.
- **500 Internal Server Error**: Si ocurre un fallo en la conexión por el middleware y driver. En Access esto típicamente ocurre si un usuario o programa tiene el archivo físico `.accdb` abierto en un estado bloqueado exclusivo.