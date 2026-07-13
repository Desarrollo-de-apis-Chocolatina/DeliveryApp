# DeliveryApp

API de gestión de restaurante con delivery (NestJS + TypeORM + PostgreSQL).

## Requisitos

- Docker y Docker Compose

## Cómo levantar el proyecto

1. Clona el repositorio.
2. Copia el archivo de variables de entorno:
   ```
   cp .env.example .env
   ```
3. Levanta los contenedores:
   ```
   docker compose up --build
   ```
4. La API queda disponible en `http://localhost:3000`.

El contenedor `api` corre en modo watch (`npm run start:dev`), así que los cambios en el código se reflejan automáticamente. La base de datos PostgreSQL corre en el contenedor `db` con los datos persistidos en un volumen.

## Estructura del proyecto

```
src/
  auth/                 # Autenticación JWT y guards
  usuarios/             # Usuarios y roles
  menu/
    categorias/
    platillos/
  recetas/              # Recetas e ingredientes por platillo
  pedidos-mesa/
  pedidos-delivery/
  repartidores/
  inventario/           # Stock de ingredientes y alertas
  caja/                 # Caja diaria
  rentabilidad/         # Reporte de márgenes por platillo
  common/               # Decorators, filters, guards, interceptors, pipes
  config/
  database/             # Migrations y seeds
test/
docs/
  GUIA_PARA_COMPANEROS.md # Guía oficial de integración para Personas 2, 3, 4, 5 y sus IAs
  postman/                # Colección de Postman
```

## 👥 Guía para el Equipo (Personas 2 a 5) y sus IAs

Si eres un compañero de equipo o un asistente de Inteligencia Artificial (ChatGPT, Claude, Gemini, Cursor) a punto de integrar un nuevo módulo, **lee o carga el archivo de guía oficial antes de escribir código**:

👉 **[docs/GUIA_PARA_COMPANEROS.md](file:///c:/Users/ale/Documents/APIS/DeliveryApp/docs/GUIA_PARA_COMPANEROS.md)**

Contiene las **reglas de oro de la arquitectura** (Guards globales, obtención de `@CurrentUser()`, DTOs con `class-validator`), indicaciones por rol/módulo y las reglas transaccionales de inventario e integración.

