# 📘 Guía Completa de Integración y Arquitectura — DeliveryApp (API de Gestión de Restaurante con Delivery)

> **Documento oficial de traspaso de arquitectura y datos primordiales para las Personas 2, 3, 4 y 5 y sus asistentes de Inteligencia Artificial (ChatGPT, Claude, Gemini, Cursor, Copilot).**  
> **Entregado por Persona 1 (@Lorena Alejandra Arriola González):** Autenticación & Base del Proyecto.

---

## 🧪 0. ¿Cómo Levantar y Probar la Parte 1 Ahora Mismo? (Paso a Paso para Compañeros)

Antes de empezar a programar tu módulo, levanta el proyecto y verifica en tu terminal y navegador que toda la base de la **Parte 1** está en marcha y funcional:

### **Paso 1: Preparar las variables de entorno**
Si acabas de clonar o abrir el proyecto y aún no tienes el archivo `.env`, cópialo desde `.env.example`:
```bash
# En Linux/Mac/Git Bash:
cp .env.example .env

# En Windows PowerShell / CMD:
copy .env.example .env
```

### **Paso 2: Levantar los contenedores con Docker Compose**
Asegúrate de tener **Docker Desktop** corriendo en tu computadora. En tu terminal, ejecuta:
```bash
docker compose up --build
```
Esto creará y levantará dos servicios:
- **`db`**: Contenedor de PostgreSQL en el puerto `5432` con volumen persistente.
- **`api`**: Contenedor con la API de NestJS en modo *hot-reload* (`npm run start:dev`) accesible en el puerto `3000`.  
*(Verás en la terminal el mensaje `🚀 API corriendo en: http://localhost:3000/api`).*

### **Paso 3: Ejecutar el Seed para crear los usuarios iniciales**
Abre una **segunda terminal** en la carpeta del proyecto (sin detener Docker) y corre el script de poblamiento inicial:
```bash
npm run seed
```
Verás un mensaje confirmando la creación de los 5 usuarios de prueba (uno para cada rol del sistema):
- **`admin@delivery.com`** (Rol: `ADMIN`) | Password: `admin123`
- **`mesero@delivery.com`** (Rol: `MESERO`) | Password: `mesero123`
- **`cocina@delivery.com`** (Rol: `COCINA`) | Password: `cocina123`
- **`cajero@delivery.com`** (Rol: `CAJERO`) | Password: `cajero123`
- **`repartidor@delivery.com`** (Rol: `REPARTIDOR`) | Password: `repartidor123`

### **Paso 4: Probar y Autenticarte en Swagger UI**
1. Abre tu navegador y entra a la documentación de Swagger:  
   👉 **http://localhost:3000/api/docs**
2. Despliega el endpoint **`POST /api/auth/login`**, haz clic en **Try it out** y envía el siguiente cuerpo JSON:
   ```json
   {
     "email": "admin@delivery.com",
     "password": "admin123"
   }
   ```
3. Haz clic en **Execute**. Recibirás una respuesta `200 OK` con tus datos de usuario y el **`access_token`**:
   ```json
   {
     "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "usuario": {
       "id": "c30983bf-...",
       "nombre": "Admin Principal",
       "email": "admin@delivery.com",
       "rol": "admin"
     }
   }
   ```
4. Copia únicamente la cadena del token (lo que está dentro de las comillas en `access_token`).
5. Sube a la parte superior de la página de Swagger y haz clic en el botón verde **🔒 Authorize** (o el icono de candado).
6. Pega tu token en la casilla `Value` y haz clic en **Authorize** y luego en **Close**.  
   ✅ *¡Listo! A partir de este momento tu sesión de Swagger está autenticada con ese rol y puedes probar cualquier endpoint protegido sin que te arroje error `401 Unauthorized`.*

---

## 🚀 1. Estado Actual y Qué Ya Está Construido (Parte 1)

La **Persona 1** ha completado y configurado el núcleo y los cimientos arquitectónicos del backend en **NestJS + TypeORM + PostgreSQL**. **Todos los demás módulos dependen y se montan sobre esta estructura.**

### ⚙️ Elementos Ya Implementados (NO reinventar ni volver a crear):
1. **Base de Datos & Docker (`db` + `api`)**:
   - PostgreSQL está configurado en `docker-compose.yml`.
   - Conexión global a TypeORM configurada e inyectada en `AppModule` (`src/database/database.module.ts`).
   - Las variables de entorno en `.env` (validadas por `src/config/env.validation.ts`) controlan puerto, host, credenciales y secretos de JWT.

2. **Entidad de Usuarios y Roles (`Usuario` + `Rol` enum)**:
   - Archivo de entidad oficial: [`src/usuarios/entities/usuario.entity.ts`](file:///c:/Users/ale/Documents/APIS/DeliveryApp/src/usuarios/entities/usuario.entity.ts).
   - Roles definidos y exportados en el Enum `Rol`:
     ```typescript
     export enum Rol {
       ADMIN = 'admin',
       MESERO = 'mesero',
       COCINA = 'cocina',
       CAJERO = 'cajero',
       REPARTIDOR = 'repartidor',
     }
     ```
   - El modelo incluye `id` (UUID), `nombre`, `email` (único), `password` (hasheado automáticamente con bcrypt y oculto `select: false`), `rol`, `activo` y `telefono`.

3. **Script de Seed Idempotente (`npm run seed`)**:
   - Archivo: [`src/database/seeds/initial-seed.ts`](file:///c:/Users/ale/Documents/APIS/DeliveryApp/src/database/seeds/initial-seed.ts).
   - Crea automáticamente 5 usuarios de prueba listos para testear:
     | Rol | Email | Password | Teléfono |
     | :--- | :--- | :--- | :--- |
     | `ADMIN` | `admin@delivery.com` | `admin123` | `+503 2000-0001` |
     | `MESERO` | `mesero@delivery.com` | `mesero123` | `+503 2000-0002` |
     | `COCINA` | `cocina@delivery.com` | `cocina123` | N/A |
     | `CAJERO` | `cajero@delivery.com` | `cajero123` | N/A |
     | `REPARTIDOR` | `repartidor@delivery.com` | `repartidor123` | `+503 2000-0005` |

4. **Autenticación JWT (`AuthModule`)**:
   - Endpoints funcionales:
     - `POST /api/auth/register` → Registro de nuevos usuarios.
     - `POST /api/auth/login` → Retorna `{ access_token, usuario }`.
   - Estrategia de Passport JWT (`src/auth/strategies/jwt.strategy.ts`) que adjunta a `req.user` el payload con formato:
     ```typescript
     export interface JwtPayload {
       sub: string; // UUID del usuario en BD
       email: string;
       rol: Rol;
     }
     ```

5. **Guards Globales (`APP_GUARD`)**:
   - En `src/app.module.ts`, están registrados como guards globales:
     1. `JwtAuthGuard`: Protege **todas las rutas** del proyecto exigiendo un token Bearer JWT válido.
     2. `RolesGuard`: Verifica que el rol del usuario en el token esté autorizado.
   - **⚠️ IMPORTANTE:** Los controladores **NO DEBEN** usar `@UseGuards(JwtAuthGuard, RolesGuard)` manualmente. ¡Ya se aplican automáticamente a toda la API!

6. **Decoradores Personalizados Disponibles (`src/common/decorators/`)**:
   - `@Public()` → Exime un endpoint o controlador de la validación del token JWT (permite acceso anónimo).
   - `@Roles(Rol.ADMIN, Rol.MESERO, ...)` → Define los roles permitidos en el controlador o método.
   - `@CurrentUser()` o `@CurrentUser('rol')` → Extrae el usuario autenticado (`req.user` / `JwtPayload`) en el handler.

7. **Configuración Global de Pipes, Filtros y Prefijos (`src/main.ts`)**:
   - **Prefijo de API:** Todas las rutas empiezan por `/api`.
   - **Validación automática de DTOs:** Configurada con `ValidationPipe` (rechaza campos extraños con `forbidNonWhitelisted: true`).
   - **Filtro de excepciones HTTP:** Configurado con `HttpExceptionFilter` para que todos los errores devuelvan un formato JSON estandarizado (`{ statusCode, timestamp, path, message }`).
   - **Swagger / OpenAPI:** Disponible y funcional en `http://localhost:3000/api/docs` con botón de **Authorize** para pegar el token Bearer.

---

## 🤖 2. Prompt y Reglas de Oro para las IAs de los Compañeros

Antes de pedirle código a tu IA (ChatGPT, Claude, Gemini, Cursor), **cópiale y pégale este bloque de contexto** para que entienda las reglas de arquitectura y no genere código incompatible:

```text
[CONTEXTO DEL PROYECTO NESTJS - DELIVERY APP]
Trabajamos sobre una arquitectura NestJS con TypeORM y PostgreSQL que YA TIENE configurada la base (Persona 1).
Sigue ESTRICTAMENTE estas reglas arquitectónicas y de integración para programar el nuevo módulo:

1. GUARDS GLOBALES ACTIVOS: En AppModule YA están registrados `JwtAuthGuard` y `RolesGuard` como APP_GUARD globales.
   - NUNCA pongas `@UseGuards(JwtAuthGuard)` o `@UseGuards(RolesGuard)` en mis controladores.
   - Para proteger por rol, usa SÓLO el decorador `@Roles(Rol.XXX, ...)` importando `import { Roles } from '../common/decorators/roles.decorator';` y `import { Rol } from '../usuarios/entities/usuario.entity';`.
   - Si un endpoint debe ser público, usa `@Public()` (`import { Public } from '../common/decorators/public.decorator';`).

2. OBTENER USUARIO ACTUAL: Si necesitas saber quién hace la petición (ej. ID o rol), usa el decorador `@CurrentUser() user: JwtPayload` importando `import { CurrentUser } from '../common/decorators/current-user.decorator';` y `import { JwtPayload } from '../auth/strategies/jwt.strategy';`. (`user.sub` es el UUID).

3. ENTIDADES Y UUIDS: Todas las entidades deben usar `@Entity('nombre_tabla')`, `@PrimaryGeneratedColumn('uuid') id: string;`, y `@CreateDateColumn({ name: 'created_at' })` / `@UpdateDateColumn({ name: 'updated_at' })`. Todas las relaciones (ManyToOne, OneToMany) deben mapear correctamente con TypeORM.

4. VALIDACIÓN DE DTOS: El proyecto usa `class-validator` y `class-transformer` con `ValidationPipe` global en estricto (`whitelist: true, forbidNonWhitelisted: true`). Todo DTO de entrada (Create/Update) DEBE tener decoradores (`@IsString()`, `@IsNumber()`, `@IsOptional()`, `@IsUUID()`, `@Min()`, etc.).

5. MANEJO DE ERRORES: Usa siempre las excepciones nativas de NestJS (`NotFoundException`, `BadRequestException`, `ConflictException`). El `HttpExceptionFilter` global las formatea automáticamente.

6. REGISTRO EN APP.MODULE: Al crear nuestro módulo (ej. `MenuModule`, `InventarioModule`), recuerda que debemos importarlo en el array `imports: [...]` de `src/app.module.ts`. Si nuestro servicio será consumido por otro módulo, DEBEMOS ponerlo en la propiedad `exports: [...]` de nuestro `@Module({ ... })`.
```

---

## 📋 3. Guía de Integración Específica por Persona / Módulo

---

### 🍽️ Persona 2 — Menú & Recetas (@Alisson Quijano)
**Objetivo:** Gestión del catálogo de categorías, platillos, recetas y su relación con inventario.

#### 📁 Estructura Sugerida del Módulo: `src/menu/` y `src/recetas/`
- Entidades propuestas:
  - `Categoria`: `id` (uuid), `nombre`, `descripcion`.
  - `Platillo`: `id` (uuid), `nombre`, `descripcion`, `precio` (decimal/float), `disponible` (boolean, default true), `categoriaId` (`ManyToOne` con `Categoria`).
  - `Receta`: `id` (uuid), `platilloId` (`OneToOne` con `Platillo`), `instrucciones`.
  - `RecetaIngrediente`: Tabla intermedia que une `Receta` con `Ingrediente` (de Persona 3). Contiene `id`, `recetaId`, `ingredienteId` (UUID) y `cantidadPorcion` (número float, ej: 0.150 kg para 1 porción de platillo).

#### 🛡️ Seguridad y Roles sugeridos:
- Endpoints de creación, modificación o borrado de Categorías, Platillos y Recetas: `@Roles(Rol.ADMIN, Rol.COCINA)`.
- Endpoints de lectura (`GET /api/menu/platillos`, etc.): Pueden ser `@Public()` o abiertos a todos (`@Roles(Rol.ADMIN, Rol.COCINA, Rol.MESERO, Rol.CAJERO, Rol.REPARTIDOR)` si prefieren restringirlo a empleados).

#### 🔥 REGLA DE NEGOCIO OBLIGATORIA: Disponibilidad Automática por Inventario
- **El Reto:** Marcar automáticamente un platillo como `disponible = false` cuando uno de sus ingredientes clave en el inventario llega a `0`.
- **Cómo integrarlo con Persona 3 (Inventario):**
  1. La **Persona 2** debe exportar su servicio de platillos en `MenuModule` (`exports: [PlatillosService]`) o crear un servicio `MenuAvailabilityService` exportado.
  2. Dicho servicio debe tener un método:
     ```typescript
     async marcarNoDisponiblePorIngrediente(ingredienteId: string, manager?: EntityManager): Promise<void> {
       // 1. Buscar todas las recetas que usan este ingredienteId
       // 2. Obtener los platilloIds de esas recetas
       // 3. Actualizar la tabla platillos marcando disponible = false para esos IDs
     }
     ```
  3. Cuando la **Persona 3** detecte que el stock de un ingrediente bajó a `0` (durante un pedido o un ajuste manual), llamará al método `marcarNoDisponiblePorIngrediente` de la Persona 2.

---

### 📦 Persona 3 — Inventario (@Christian Renderos)
**Objetivo:** Control de stock de ingredientes, alertas de stock mínimo, cálculo de costo promedio y servicio de descuento consumible por Pedidos.

#### 📁 Estructura Sugerida del Módulo: `src/inventario/`
- Entidad principal: `Ingrediente`
  - `id` (uuid), `nombre` (varchar unique), `unidadMedida` (`kg`, `g`, `lt`, `ml`, `unidad`), `stock` (decimal/float), `stockMinimo` (decimal/float), `costoUnitarioPromedio` (decimal/float), `ultimaCompraFecha` (Date).

#### 🛡️ Seguridad y Roles sugeridos:
- Todos los CRUDs de inventario (crear ingrediente, ajustar stock, registrar compra): `@Roles(Rol.ADMIN, Rol.COCINA)`.

#### 🔥 REGLA DE NEGOCIO 1: Servicio Reutilizable de Descuento de Stock (Para Pedidos - Persona 4)
- La **Persona 3** DEBE exportar en `src/inventario/inventario.module.ts` el servicio principal:
  ```typescript
  @Module({
    imports: [TypeOrmModule.forFeature([Ingrediente]), /* MenuModule si necesita llamar disponibilidad */],
    controllers: [InventarioController],
    providers: [InventarioService],
    exports: [InventarioService], // <--- ¡OBLIGATORIO PARA QUE PEDIDOS LO PUEDA INYECTAR!
  })
  export class InventarioModule {}
  ```
- El servicio `InventarioService` debe implementar un método público diseñado para ejecutarse dentro de una **transacción de base de datos** (recibiendo un `EntityManager` de TypeORM):
  ```typescript
  async descontarStockDePlatillo(
    platilloId: string,
    cantidadPorcionesPedidas: number,
    transactionalEntityManager: EntityManager
  ): Promise<void> {
    // 1. Consultar la receta del platilloId (unión con RecetaIngrediente)
    // 2. Por cada ingrediente en la receta:
    //    const cantidadADescontar = recetaIngrediente.cantidadPorcion * cantidadPorcionesPedidas;
    //    if (ingrediente.stock < cantidadADescontar) {
    //      throw new BadRequestException(`Stock insuficiente del ingrediente: ${ingrediente.nombre}`);
    //    }
    //    ingrediente.stock -= cantidadADescontar;
    //    await transactionalEntityManager.save(Ingrediente, ingrediente);
    //
    //    // ALERTA DE STOCK MÍNIMO:
    //    if (ingrediente.stock <= ingrediente.stockMinimo) {
    //      console.warn(`🚨 ALERTA: El ingrediente ${ingrediente.nombre} está en o por debajo del stock mínimo (${ingrediente.stock}/${ingrediente.stockMinimo})`);
    //    }
    //
    //    // MARCAR PLATILLO NO DISPONIBLE SI LLEGA A 0:
    //    if (ingrediente.stock <= 0) {
    //      await this.platillosService.marcarNoDisponiblePorIngrediente(ingrediente.id, transactionalEntityManager);
    //    }
  }
  ```

#### 🔥 REGLA DE NEGOCIO 2: Cálculo de Precio Promedio Ponderado de Ingredientes
- Al crear un endpoint para registrar una nueva compra de un ingrediente (`POST /api/inventario/ingredientes/:id/compra`), el costo real se debe recalcular en lugar de reemplazarse:
- **Fórmula Matemática del Precio Promedio Ponderado:**
  $$\text{Nuevo Costo Promedio} = \frac{(\text{Stock Actual} \times \text{Costo Promedio Actual}) + (\text{Cantidad Ingresada} \times \text{Costo Compra Unitario})}{\text{Stock Actual} + \text{Cantidad Ingresada}}$$
- Guardar este `costoUnitarioPromedio` en la entidad `Ingrediente` para que la **Persona 5 (Rentabilidad)** lo utilice al calcular el margen de ganancia.

---

### 🛵 Persona 4 — Pedidos (Mesa + Delivery) & Repartidores (@Gabriel Martínez)
**Objetivo:** Gestión de pedidos en restaurante (mesas), pedidos a domicilio, asignación y tope de repartidores, y ejecución transaccional del descuento de inventario.

#### 📁 Estructura Sugerida del Módulo: `src/pedidos-mesa/`, `src/pedidos-delivery/`, `src/repartidores/`
- Enums de estados recomendados:
  ```typescript
  export enum EstadoPedidoMesa {
    TOMADO = 'tomado',
    EN_COCINA = 'en_cocina',
    LISTO = 'listo',
    ENTREGADO = 'entregado',
    PAGADO = 'pagado',
  }

  export enum EstadoPedidoDelivery {
    TOMADO = 'tomado',
    EN_COCINA = 'en_cocina',
    LISTO = 'listo',
    EN_CAMINO = 'en_camino',
    ENTREGADO = 'entregado',
    PAGADO = 'pagado',
  }
  ```
- Entidades recomendadas:
  - `PedidoMesa`: `id`, `numeroMesa` (int), `estado` (enum), `meseroId` (uuid de `Usuario`), `total` (decimal), `createdAt`.
  - `PedidoDelivery`: `id`, `direccion` (text), `telefonoContacto`, `clienteNombre`, `estado` (enum), `repartidorId` (uuid nullable que apunta a un usuario con rol `REPARTIDOR`), `costoEnvio`, `total`, `createdAt`.
  - `DetallePedido`: `id`, `pedidoMesaId` o `pedidoDeliveryId`, `platilloId`, `cantidad`, `precioUnitario`, `subtotal`.

#### 🛡️ Seguridad y Roles sugeridos:
- Tomar pedidos mesa: `@Roles(Rol.MESERO, Rol.ADMIN)`.
- Cambios de estado en cocina (`tomado` → `en cocina` → `listo`): `@Roles(Rol.COCINA, Rol.ADMIN)`.
- Asignar y pasar pedidos delivery a en camino / entregado: `@Roles(Rol.REPARTIDOR, Rol.ADMIN, Rol.CAJERO)`.

#### 🔥 REGLA DE NEGOCIO 1 CRÍTICA: Descuento Transaccional al pasar de `EN_COCINA` a `LISTO`
- **El Reto:** El descuento de inventario **NO** se hace al tomar el pedido ni al empezar a cocinar, **SÓLO se ejecuta en la transición de `'en cocina'` → `'listo'`**. Y debe ser una **Transacción ACID de Base de Datos** (`TypeORM Transaction`).
- **Cómo implementarlo en `PedidosMesaService` / `PedidosDeliveryService`:**
  ```typescript
  // En tu módulo debes importar: InventarioModule (de Persona 3)
  constructor(
    private readonly dataSource: DataSource,
    private readonly inventarioService: InventarioService, // <--- Inyectado del módulo de Christian
  ) {}

  async cambiarEstadoAListo(pedidoId: string): Promise<PedidoMesa> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const pedido = await manager.findOne(PedidoMesa, {
        where: { id: pedidoId },
        relations: ['detalles'],
      });

      if (!pedido || pedido.estado !== EstadoPedidoMesa.EN_COCINA) {
        throw new BadRequestException('El pedido debe estar en estado EN_COCINA para pasar a LISTO');
      }

      // 1. Ejecutar descuento transaccional en el Inventario (Persona 3) por cada platillo del pedido
      for (const detalle of pedido.detalles) {
        await this.inventarioService.descontarStockDePlatillo(
          detalle.platilloId,
          detalle.cantidad,
          manager // <--- Se pasa el manager para que todo quede en la misma transacción ACID
        );
      }

      // 2. Si el inventario no lanzó error (hay stock), actualizamos el estado del pedido
      pedido.estado = EstadoPedidoMesa.LISTO;
      return await manager.save(PedidoMesa, pedido);
    });
  }
  ```
- *Nota:* Si el stock de cualquier ingrediente es insuficiente, `descontarStockDePlatillo` lanzará un error (`BadRequestException`), **toda la transacción hará Rollback automáticamente**, el inventario no se tocará y el pedido permanecerá en `EN_COCINA`.

#### 🔥 REGLA DE NEGOCIO 2 CRÍTICA: Repartidor máx. 3 pedidos en camino
- Al asignar o pasar un pedido de delivery al estado `'en_camino'` con un `repartidorId`:
  ```typescript
  async cambiarAEnCamino(pedidoId: string, repartidorId: string): Promise<PedidoDelivery> {
    // 1. Contar cuántos pedidos activos tiene ese repartidor actualmente
    const pedidosActivos = await this.pedidoDeliveryRepository.count({
      where: {
        repartidorId: repartidorId,
        estado: EstadoPedidoDelivery.EN_CAMINO,
      },
    });

    // 2. Regla de negocio de tope de entregas simultáneas
    if (pedidosActivos >= 3) {
      throw new BadRequestException('El repartidor seleccionado ya tiene 3 pedidos activos en camino. Debe entregar uno antes de tomar otro.');
    }

    // 3. Si tiene menos de 3, asignar y guardar
    // ...
  }
  ```

---

### 💵 Persona 5 — Caja, Rentabilidad & QA/Docs (@Melisa Rivas)
**Objetivo:** Finanzas del restaurante (cierres diarios, margen de rentabilidad real por platillo), control de calidad (70% cobertura de pruebas Jest) y documentación final (Postman + Swagger).  
**📅 Fecha y Hora de Entrega Límite:** **17 de julio de 2026 a las 13:00**

#### 📁 Estructura Sugerida del Módulo: `src/caja/`, `src/rentabilidad/`

#### 🛡️ Seguridad y Roles sugeridos:
- Todos los reportes financieros, cierres de caja y márgenes: `@Roles(Rol.ADMIN, Rol.CAJERO)`.

#### 🔥 FUNCIONALIDAD 1: Cierre de Caja Diario (`CajaModule`)
- Endpoint: `GET /api/caja/cierre-diario?fecha=2026-07-16` (o `POST /api/caja/cerrar` para generar el reporte de fin de turno).
- Cálculos requeridos sumando los pedidos en estado `PAGADO` de `PedidoMesa` y `PedidoDelivery` de esa fecha:
  1. **Total de Ventas Brutas** ($ del día).
  2. **Total de Propinas** acumuladas.
  3. **Desglose por Tipo de Pago:** Cuánto se recaudó por `EFECTIVO`, `TARJETA` y `TRANSFERENCIA` (necesitarás agregar el campo `tipoPago` y `propina` en los pedidos o tabla de cobros).
  4. **Comparativa vs Día Anterior:**
     $$\text{Porcentaje de Variación} = \left( \frac{\text{Ventas Hoy} - \text{Ventas Ayer}}{\text{Ventas Ayer}} \right) \times 100$$
     *(Ejemplo: `+12.5% vs el día anterior` o `+$150.00 más que ayer`).*

#### 🔥 FUNCIONALIDAD 2: Reporte de Rentabilidad por Platillo (`RentabilidadModule`)
- Endpoint: `GET /api/rentabilidad/platillos`
- Debe consultar todos los platillos (de **Persona 2**) y las recetas con sus ingredientes (cuyo costo unitario ponderado calcula **Persona 3**).
- **Cálculo de Margen para cada platillo:**
  1. **Costo de Receta Real:** Sumatoria de `(RecetaIngrediente.cantidadPorcion * Ingrediente.costoUnitarioPromedio)` para todos los ingredientes del platillo.
  2. **Margen Nominal ($):** `Platillo.precio - Costo de Receta Real`.
  3. **Margen Porcentual (%):** `((Platillo.precio - Costo de Receta Real) / Platillo.precio) * 100`.
- Retornar un array en JSON ordenado por rentabilidad para que el administrador sepa cuáles platillos dejan más ganancia.

#### 🧪 FUNCIONALIDAD 3: Pruebas Unitarias y Funcionales (70% Cobertura Mínima)
- **Rol de Coordinación QA:** La **Persona 5** lidera y verifica que la combinación de todos los tests del equipo alcance **mínimo el 70% de cobertura en todo el código (`src/`)**.
- Comando de verificación oficial:
  ```bash
  npm run test:cov
  ```
- **Indicaciones para las IAs de cada compañero al crear tests (`*.spec.ts`):**
  - Cada servicio (`*.service.ts`) y controlador (`*.controller.ts`) debe tener su archivo `*.spec.ts`.
  - Usar los utilitarios de prueba de NestJS (`Test.createTestingModule`) y **mockear los repositorios de TypeORM** (`getRepositoryToken(Entidad)`).
  - Incluir pruebas E2E o Supertest para verificar el flujo transaccional y el rechazo con error `400 Bad Request` cuando el inventario es insuficiente al intentar pasar un pedido de `EN_COCINA` a `LISTO`.

#### 📚 FUNCIONALIDAD 4: Documentación Final y Colección Postman
- **Swagger Consolidado:** Ya está inicializado por Persona 1 en `src/main.ts` (`/api/docs`). Asegurarse de que cada compañero agregue decoradores como `@ApiOperation({ summary: '...' })`, `@ApiResponse({ status: 200, type: ... })` y `@ApiBearerAuth('bearer')` en sus endpoints para que el Swagger final se vea profesional.
- **Colección de Postman Completa (`docs/postman/DeliveryApp.postman_collection.json`):**
  - La Persona 5 debe exportar una colección de Postman y guardarla en la carpeta `docs/postman/`.
  - La colección debe incluir la secuencia ordenada para la demo del profesor/evaluación:
    1. `POST /api/auth/login` (como `admin@delivery.com` / `admin123`) → Guardar token.
    2. `POST /api/inventario/ingredientes` → Crear ingredientes (Ej: Tomate stock=10 kg, Carne stock=5 kg).
    3. `POST /api/menu/categorias` y `POST /api/menu/platillos` → Crear categoría y platillo (Ej: Hamburguesa Especial).
    4. `POST /api/recetas` → Vincular Hamburguesa con 0.200 kg de Carne y 0.050 kg de Tomate.
    5. `POST /api/pedidos-mesa` o `POST /api/pedidos-delivery` → Crear un pedido en estado `TOMADO` → pasarlo a `EN_COCINA`.
    6. `PATCH /api/pedidos-mesa/:id/listo` → **Probar flujo de Éxito:** Verificar en la respuesta y en BD que el stock se descontó correctamente.
    7. **Probar flujo de Escenario de Inventario Insuficiente:** Pedir 100 Hamburguesas cuando solo hay 5 kg de carne. Intentar pasar a `LISTO` y mostrar que la API responde `400 Bad Request ("Stock insuficiente de Carne")` sin corromper el inventario (rollback ACID).
    8. `GET /api/caja/cierre-diario` y `GET /api/rentabilidad/platillos` → Mostrar reportes finales del día.

---

## 🔗 4. Checklist de Integración para el Equipo (Antes de Unir el Código)

Antes de hacer Merge / Pull Request a la rama principal (`main` / `develop`), verifiquen como equipo:

- [ ] ¿Tu módulo está importado en `imports: [...]` de `src/app.module.ts`?
- [ ] ¿Si otro módulo usa tu servicio, tu módulo tiene `exports: [TuService]`?
- [ ] ¿Tus entidades usan IDs UUID (`@PrimaryGeneratedColumn('uuid')`) y están registradas en el `TypeOrmModule.forFeature([Entidad])` de tu módulo?
- [ ] ¿Las transiciones de inventario usan `dataSource.transaction(async manager => ...)` y pasan el `manager` al `InventarioService`?
- [ ] ¿No agregaste `@UseGuards(JwtAuthGuard)` redundantes en tus controladores? (Recuerda que ya es global).
- [ ] ¿Ejecutaste `npm run test:cov` en local y tu módulo no baja el promedio total del 70% de cobertura?
- [ ] ¿Probaste tus endpoints en `http://localhost:3000/api/docs` (Swagger) logueándote con el token Bearer?

---
*¡Con esto todas las piezas encajarán de manera limpia, tipada y sin conflictos arquitectónicos en NestJS!* 🚀
