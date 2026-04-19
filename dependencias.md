# Dependencias del Proyecto

Este archivo describe para qué sirve cada dependencia instalada en el proyecto.

## Dependencias

- `compression`
  - Añade compresión gzip/deflate a las respuestas HTTP.
  - Mejora el rendimiento reduciendo el tamaño de los datos enviados al cliente.

- `cors`
  - Permite controlar qué orígenes pueden acceder a la API desde el navegador.
  - Utilizado para habilitar o restringir el acceso Cross-Origin Resource Sharing.

- `dotenv`
  - Carga variables de entorno desde un archivo `.env`.
  - Facilita la configuración del proyecto sin exponer valores en el código.

- `dotenv-safe`
  - Extiende `dotenv` validando que todas las variables de entorno requeridas existan.
  - Evita que la aplicación arranque con configuración incompleta.

- `express`
  - Framework de Node.js para construir servidores web y APIs.
  - Proporciona ruteo, middleware y manejo de peticiones/respuestas.

- `express-rate-limit`
  - Implementa límites de petición por IP.
  - Previene abusos y ataques de fuerza bruta contra los endpoints.

- `helmet`
  - Configura cabeceras HTTP de seguridad automáticamente.
  - Reduce vectores de ataque como clickjacking, sniffing y otras vulnerabilidades comunes.

- `joi`
  - Librería para validar y sanitizar datos de entrada.
  - Se usa para asegurar que los parámetros y el body cumplan formatos esperados.

- `jsonwebtoken`
  - Genera y verifica tokens JWT.
  - Permite autenticar usuarios en la API usando tokens firmados.

- `node-cache`
  - Caché en memoria para Node.js.
  - Útil para almacenar respuestas frecuentes y reducir consultas a la base de datos.

- `odbc`
  - Driver para conectarse a bases de datos mediante ODBC.
  - Se usa aquí para conectar con la base de datos Microsoft Access.

- `winston`
  - Librería de logging para Node.js.
  - Permite registrar información, advertencias y errores en consola y archivos.

## Nota

Las dependencias listadas son las necesarias para el funcionamiento actual del proyecto. Si se agregan nuevas librerías o se eliminan dependencias, este archivo debe actualizarse para reflejar los cambios.
