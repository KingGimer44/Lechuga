# API RESTful para Gestión de Empleados y Reportes

Esta API proporciona endpoints para administrar empleados, reportes y registros de cambios de estado de reportes (reporteslog).

## Requisitos

- Node.js (v14 o superior)
- NPM

## Instalación

1. Clonar el repositorio o descargar los archivos
2. Instalar dependencias:

```bash
npm install
```

3. Configurar las variables de entorno:
   - Crear un archivo `.env` en la raíz del proyecto
   - Agregar las siguientes variables:
   ```
   TURSO_CONNECTION_URL=https://your-database-url.turso.io
   TURSO_AUTH_TOKEN=your-auth-token
   PORT=3001
   ```
   Nota: Debes crear una base de datos en [Turso](https://turso.tech/) y obtener tus credenciales

4. Iniciar el servidor:

```bash
npm run dev
```

El servidor se ejecutará en http://localhost:3001 por defecto.

## Endpoints

### Empleados

- **GET /api/empleados** - Obtener todos los empleados
- **GET /api/empleados/:id** - Obtener un empleado específico
- **POST /api/empleados** - Crear un nuevo empleado
  ```json
  {
    "nombreEmpleado": "Juan Pérez",
    "numero": 123,
    "fechaIngreso": "2023-06-15"
  }
  ```
- **PUT /api/empleados/:id** - Actualizar un empleado existente
  ```json
  {
    "nombreEmpleado": "Juan Pérez",
    "numero": 123,
    "fechaIngreso": "2023-06-15"
  }
  ```
- **DELETE /api/empleados/:id** - Eliminar un empleado

### Reportes

- **GET /api/reportes** - Obtener todos los reportes
- **GET /api/reportes/:id** - Obtener un reporte específico
- **GET /api/reportes/empleado/:idEmpleado** - Obtener reportes de un empleado específico
- **GET /api/reportes/estado/:estado** - Filtrar reportes por estado
- **POST /api/reportes** - Crear un nuevo reporte
  ```json
  {
    "idEmpleado": 1,
    "descripcion": "Descripción del problema",
    "area": "Área afectada",
    "estado": "Sin Revision"
  }
  ```
- **PUT /api/reportes/:id** - Actualizar un reporte existente
  ```json
  {
    "idEmpleado": 1,
    "descripcion": "Descripción actualizada",
    "area": "Área",
    "estado": "En Proceso"
  }
  ```
- **PATCH /api/reportes/:id/estado** - Actualizar solo el estado de un reporte
  ```json
  {
    "estado": "Solucionado"
  }
  ```
- **DELETE /api/reportes/:id** - Eliminar un reporte (también elimina sus logs asociados)

### Reportes Log

- **GET /api/reportes-log** - Obtener todos los logs de reportes
- **GET /api/reportes-log/:id** - Obtener un log específico
- **GET /api/reportes-log/reporte/:idReporte** - Obtener logs de un reporte específico
- **GET /api/reportes-log/estado/:estado** - Filtrar logs por estado
- **GET /api/reportes-log/historial/:idReporte** - Obtener historial completo de estados para un reporte
- **POST /api/reportes-log** - Crear un nuevo log manualmente
  ```json
  {
    "idReporte": 1,
    "estado": "En Proceso"
  }
  ```
- **DELETE /api/reportes-log/:id** - Eliminar un log específico
- **DELETE /api/reportes-log/reporte/:idReporte** - Eliminar todos los logs de un reporte

## Estructura de la Base de Datos

La API utiliza Turso con las siguientes tablas:

### Tabla `empleados`
- idEmpleado (INTEGER, clave primaria)
- nombreEmpleado (TEXT)
- numero (INTEGER)
- fechaIngreso (DATE)

### Tabla `reportes`
- idReporte (INTEGER, clave primaria)
- idEmpleado (INTEGER, clave foránea)
- descripcion (TEXT)
- area (TEXT)
- fechaHora (DATETIME)
- estado (TEXT)

### Tabla `reporteslog`
- idLog (INTEGER, clave primaria)
- idReporte (INTEGER, clave foránea)
- estado (TEXT)
- fechaHora (DATETIME)

### Triggers
- `reportes_after_insert`: Agrega un registro a `reporteslog` cuando se crea un nuevo reporte.
- `reportes_after_update`: Agrega un registro a `reporteslog` cuando se actualiza el estado de un reporte. 