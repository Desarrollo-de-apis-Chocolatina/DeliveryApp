# DeliveryApp — API de Gestión de Restaurante con Delivery

API RESTful que gestiona la operación de un restaurante con pedidos en mesa y a domicilio, vinculando la cocina con el inventario de ingredientes y el análisis financiero (caja y rentabilidad).

**Materia:** Diseño y Desarrollo de API

**Autores:** 
- Alejandra Arriola
- Alisson Quijano 
- Christian Renderos 
- Gabriel Martínez 
- Melisa Rivas.

---

## Descripción

El sistema permite a un restaurante operar con múltiples canales de venta y controlar de forma integrada el menú, las recetas, el inventario, los pedidos y las finanzas. Sus capacidades principales son:

- Catálogo de menú (categorías y platillos con precio, descripción y disponibilidad).
- Recetas por platillo (ingredientes y cantidad por porción).
- Inventario de ingredientes con stock, stock mínimo, alertas y costo promedio ponderado.
- Pedidos en mesa y de delivery con máquina de estados y asignación de repartidores.
- Descuento automático y transaccional de inventario al preparar un pedido.
- Cierre de caja diario y reporte de rentabilidad por platillo.

## Tecnologías

- **NestJS 11** (Node.js, TypeScript)
- **TypeORM** sobre **PostgreSQL 16**
- **JWT** (Passport) para autenticación y guards de autorización por rol
- **class-validator / class-transformer** para validación de DTOs
- **Swagger / OpenAPI** para documentación
- **Jest + Supertest** para pruebas unitarias y e2e
- **Docker / Docker Compose** para el entorno

## Arquitectura

La aplicación se organiza en módulos de NestJS. La autenticación es global: `JwtAuthGuard` y `RolesGuard` se registran como guards globales en `AppModule`, por lo que todas las rutas exigen un token JWT válido (salvo las marcadas como públicas) y el rol declarado con el decorador `@Roles(...)`.

| Módulo | Responsabilidad | Rutas base |
| --- | --- | --- |
| `auth` / `usuarios` | Registro, login JWT, usuarios y roles | `/api/auth`, `/api/usuarios` |
| `menu` (`categorias`, `platillos`) | Catálogo del menú | `/api/menu/categorias`, `/api/menu/platillos` |
| `recetas` | Ingredientes por platillo | `/api/recetas` |
| `inventario` | Stock, alertas y costo promedio ponderado | `/api/inventario/ingredientes` |
| `pedidos-mesa` | Pedidos en mesa y su máquina de estados | `/api/pedidos-mesa` |
| `pedidos-delivery` | Pedidos a domicilio y repartidor asignado | `/api/pedidos-delivery` |
| `repartidores` | Gestión de repartidores | `/api/repartidores` |
| `caja` | Cobro de pedidos y cierre de caja diario | `/api/caja` |
| `rentabilidad` | Margen por platillo | `/api/rentabilidad` |

### Reglas de negocio principales

- El descuento de inventario se ejecuta **solo** en la transición `EN_COCINA -> LISTO`, dentro de una transacción de base de datos. Si algún ingrediente no tiene stock suficiente, la operación falla con `400` y se revierte por completo (rollback), sin alterar el inventario.
- Un platillo se marca automáticamente como no disponible cuando un ingrediente clave llega a stock 0.
- El costo de un ingrediente se calcula con precio promedio ponderado al registrar compras.
- Un repartidor no puede tener más de 3 pedidos en estado `EN_CAMINO` de forma simultánea.
- El cierre de caja diario agrega ventas, propinas y desglose por tipo de pago, con comparativa porcentual contra el día anterior.
- La rentabilidad por platillo se calcula como precio de venta menos el costo real de la receta (cantidad por porción por costo promedio del ingrediente).

## Roles

`admin`, `mesero`, `cocina`, `cajero`, `repartidor`. Cada endpoint restringe los roles permitidos; un rol sin permiso recibe `403 Forbidden` y una petición sin token válido recibe `401 Unauthorized`. Todo usuario autenticado, sin importar su rol, puede consultar su propio perfil (`GET /api/auth/profile`).

### Matriz de permisos por rol

| Módulo / acción | admin | mesero | cocina | cajero | repartidor |
| --- | :---: | :---: | :---: | :---: | :---: |
| Usuarios (crear, listar, editar, desactivar) | ✓ | — | — | — | — |
| Repartidores (crear, listar) | ✓ | — | — | — | — |
| Menú y recetas — consultar (categorías, platillos, recetas) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Menú y recetas — crear, editar, eliminar | ✓ | — | ✓ | — | — |
| Inventario — consultar (ingredientes, alertas) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Inventario — crear, editar, registrar compra, eliminar | ✓ | — | ✓ | — | — |
| Pedidos de mesa — crear, agregar platillos a la cuenta | ✓ | ✓ | — | — | — |
| Pedidos de mesa — listar | ✓ | ✓ | ✓ | ✓ | — |
| Pedidos de mesa — cambiar estado | ✓ | ✓ | ✓ | — | — |
| Pedidos de delivery — crear, asignar repartidor | ✓ | — | — | ✓ | — |
| Pedidos de delivery — listar | ✓ | — | ✓ | ✓ | ✓ |
| Pedidos de delivery — cambiar estado | ✓ | — | ✓ | ✓ | ✓ |
| Caja — registrar pago, cierre diario | ✓ | — | — | ✓ | — |
| Rentabilidad por platillo | ✓ | — | — | ✓ | — |

## Requisitos

- Docker y Docker Compose
- (Opcional, para ejecutar sin contenedores) Node.js 20+ y una instancia de PostgreSQL

## Configuración y ejecución

1. Copia las variables de entorno:
   ```bash
   cp .env.example .env
   ```
2. Levanta los contenedores (API y base de datos):
   ```bash
   docker compose up --build
   ```
   La API queda en `http://localhost:3000/api` y la base de datos PostgreSQL en el contenedor `db`.
3. Puebla los usuarios de prueba iniciales (en otra terminal, sin detener Docker):
   ```bash
   docker compose exec api npm run seed
   ```

### Usuarios de prueba

| Rol | Email | Contraseña |
| --- | --- | --- |
| admin | admin@delivery.com | admin123 |
| mesero | mesero@delivery.com | mesero123 |
| cocina | cocina@delivery.com | cocina123 |
| cajero | cajero@delivery.com | cajero123 |
| repartidor | repartidor@delivery.com | repartidor123 |

## Documentación de la API

- **Swagger UI:** `http://localhost:3000/api/docs`. Usa el botón **Authorize** para pegar el token Bearer obtenido en `POST /api/auth/login` y probar los endpoints protegidos.
- **Colección Postman:** [docs/postman/DeliveryApp.postman_collection.json](docs/postman/DeliveryApp.postman_collection.json). Contiene el flujo de demostración completo (mesa, delivery, escenario de inventario insuficiente y reportes) con auto-guardado de token e IDs.

## Comandos importantes

El proyecto está pensado para ejecutarse con Docker. La API corre dentro del contenedor `api` y se conecta a la base de datos por la red interna, por lo que los comandos que necesitan base de datos deben ejecutarse dentro del contenedor (con `docker compose exec api ...`).

| Comando | Descripción |
| --- | --- |
| `docker compose up --build` | Levanta la API (contenedor `api`) y la base de datos (contenedor `db`) |
| `docker compose exec api npm run seed` | Crea los usuarios de prueba |
| `docker compose exec api npm test` | Ejecuta todas las pruebas unitarias |
| `docker compose exec api npm run test:cov` | Pruebas unitarias con reporte de cobertura (umbral global 70%) |
| `docker compose exec api npm run test:e2e` | Pruebas end-to-end del flujo completo |
| `docker compose exec api npm run build` | Compila el proyecto |
| `docker compose exec api npm run lint` | Linting con ESLint |

> Los comandos que no requieren base de datos (`npm test`, `npm run test:cov`, `npm run build`, `npm run lint`) también funcionan directamente en el host si antes instalas las dependencias con `npm install`.

## Pruebas

- Las pruebas unitarias mockean los repositorios de TypeORM y cubren servicios y controladores de todos los módulos. La cobertura global exigida es del 70% (forzada por `coverageThreshold` en `package.json`).
- Las pruebas e2e requieren una base de datos PostgreSQL accesible y validan el flujo real, incluido el escenario de inventario insuficiente con rollback transaccional.

Ejecutar los e2e dentro del contenedor (recomendado, evita ajustar la conexión):
```bash
docker compose exec api npm run test:e2e
```

## Estructura del proyecto

```
src/
  auth/                 Autenticación JWT, guards y estrategias
  usuarios/             Usuarios y roles
  menu/
    categorias/
    platillos/
  recetas/              Recetas e ingredientes por platillo
  inventario/           Stock, alertas y costo promedio ponderado
  pedidos-mesa/         Pedidos en mesa
  pedidos-delivery/     Pedidos a domicilio y repartidor
  repartidores/         Gestión de repartidores
  caja/                 Cobro de pedidos y cierre de caja diario
  rentabilidad/         Reporte de margen por platillo
  common/               Decoradores, filtros, guards, pipes e interceptores
  config/               Validación de variables de entorno
  database/             Conexión, migraciones y seeds
test/                   Pruebas end-to-end
docs/                   Documentación y colección Postman
```

## Notas operativas

- La base de datos del contenedor `db` publica el puerto `5432`. Si tu máquina ya tiene un PostgreSQL local ocupando ese puerto, crea un `docker-compose.override.yml` que lo publique en otro puerto (por ejemplo `5433:5432`) y ajusta `DB_PORT` en tu `.env`.
- Dentro de Docker, la API se conecta a la base de datos por el nombre de servicio (`DB_HOST=db`). Para ejecutar la API o los e2e directamente en el host, apunta `DB_HOST` a `127.0.0.1` y el `DB_PORT` publicado.
