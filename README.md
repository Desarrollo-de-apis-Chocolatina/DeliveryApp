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

👉 **[docs/GUIA_PARA_COMPANEROS.md](docs/GUIA_PARA_COMPANEROS.md)**

Contiene las **reglas de oro de la arquitectura** (Guards globales, obtención de `@CurrentUser()`, DTOs con `class-validator`), indicaciones por rol/módulo y las reglas transaccionales de inventario e integración.

## Caja y Rentabilidad (Persona 5)

- `POST /api/caja/pagos` — registra el cobro de un pedido (tipo de pago, propina) y lo marca `PAGADO`.
- `GET /api/caja/cierre-diario?fecha=YYYY-MM-DD` — ventas, propinas, desglose por tipo de pago y comparativa vs día anterior.
- `GET /api/rentabilidad/platillos` — margen por platillo (precio − costo de receta), en valor y porcentaje.

Todos requieren rol `ADMIN` o `CAJERO`.

## Pruebas y documentación

```bash
npm run test:cov   # unitarias + cobertura (umbral global 70%)
npm run test:e2e   # flujo completo, incluye inventario insuficiente (400 + rollback)
```

Las pruebas e2e necesitan una base de datos PostgreSQL accesible. Si el puerto `5432` ya está ocupado por un Postgres local, crea un `docker-compose.override.yml` que publique el contenedor en otro puerto (p. ej. `5433:5432`) y ajusta `DB_PORT` en tu `.env`.

- **Swagger:** `http://localhost:3000/api/docs`.
- **Colección Postman:** [`docs/postman/DeliveryApp.postman_collection.json`](docs/postman/DeliveryApp.postman_collection.json) — secuencia de demostración de mesa, delivery e inventario insuficiente.

