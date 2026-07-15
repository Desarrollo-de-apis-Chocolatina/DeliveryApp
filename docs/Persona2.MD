# Guía de Integración – De persona 2 para persona 3

## Objetivo

Este documento explica cómo integrar el módulo de **Inventario** con los módulos desarrollados por **Persona 2 (Menú y Recetas)**.

El objetivo principal es mantener una arquitectura desacoplada entre ambos módulos. Inventario **no debe acceder directamente a las entidades o repositorios de Menú**, sino utilizar los servicios públicos que ya fueron expuestos para la integración.

---

# ¿Qué implementó Persona 2?

Se desarrollaron completamente los siguientes módulos:

```text
src/
├── menu/
│   ├── categorias/
│   └── platillos/
│
└── recetas/
```

## Funcionalidades implementadas

* CRUD completo de Categorías.
* CRUD completo de Platillos.
* Administración de Recetas por platillo.
* Relaciones TypeORM entre entidades.
* DTOs y validaciones.
* Protección mediante JWT.
* Control de acceso mediante Roles.
* Documentación Swagger.
* Servicios exportados para integración con otros módulos.

No es necesario modificar estos módulos para implementar Inventario.

---

# Arquitectura actual

La estructura de datos implementada es la siguiente:

```text
Categoria
    │
    │ 1
    ▼
Platillo
    │
    │ 1
    ▼
RecetaIngrediente
```

Actualmente **la entidad `Ingrediente` todavía no existe**, ya que será desarrollada dentro del módulo de Inventario.

Por esa razón, la entidad `RecetaIngrediente` almacena temporalmente únicamente:

```ts
ingredienteId: number;
```

Una vez exista la entidad `Ingrediente`, únicamente deberá sustituirse ese campo por una relación `ManyToOne`, sin modificar la lógica del servicio de Recetas.

---

# Entidades implementadas

## Categoria

Contiene:

* id
* nombre
* descripcion
* activa

Relación:

```
Categoria (1)
        │
        ▼
Platillo (N)
```

Las categorías utilizan **soft delete**, por lo que al eliminar una categoría únicamente cambia su estado de activa a inactiva.

---

## Platillo

Contiene:

* id
* nombre
* descripcion
* precio
* disponible
* categoria

Relaciones:

* ManyToOne → Categoria
* OneToMany → RecetaIngrediente

Los platillos también utilizan **soft delete**, marcando el campo `disponible` como `false`.

---

## RecetaIngrediente

Representa los ingredientes necesarios para preparar **una porción** de un platillo.

Cada registro contiene:

```text
id

platillo

ingredienteId

cantidadPorPorcion

esIngredienteClave
```

Ejemplo:

| Platillo | Ingrediente | Cantidad | Clave |
| -------- | ----------- | -------- | ----- |
| Pizza    | Harina      | 300 g    | Sí    |
| Pizza    | Salsa       | 120 ml   | Sí    |
| Pizza    | Orégano     | 5 g      | No    |

---

# Decisiones de negocio importantes

## Ingredientes clave

Cada ingrediente de una receta posee el atributo:

```ts
esIngredienteClave: boolean;
```

Este atributo determina si un ingrediente afecta o no la disponibilidad del platillo.

### Comportamiento esperado

Si un ingrediente tiene:

```text
esIngredienteClave = true
```

y su stock llega a **0**, el módulo de Inventario deberá invocar:

```ts
PlatillosService.marcarNoDisponiblePorIngrediente(
    ingredienteId,
);
```

El módulo Menú será responsable de identificar todos los platillos que utilizan ese ingrediente como ingrediente clave y marcar dichos platillos como:

```text
disponible = false
```

Si un ingrediente tiene:

```text
esIngredienteClave = false
```

su falta de stock **no debe modificar automáticamente la disponibilidad del platillo**.

La decisión de qué ingredientes son clave pertenece al módulo de Menú, mediante la administración de recetas.

---

# Funcionamiento de las recetas

Las recetas representan el consumo de ingredientes por porción.

Cada receta almacena:

* ingredienteId
* cantidadPorPorcion
* esIngredienteClave

Actualmente **no existe edición individual de ingredientes**.

Cuando una receta es modificada ocurre el siguiente proceso:

1. Se elimina completamente la receta anterior.
2. Se crea una nueva lista de ingredientes.

Este comportamiento fue elegido para simplificar la lógica de actualización y evitar inconsistencias entre ingredientes antiguos y nuevos.

---

# Servicios públicos disponibles

Los siguientes servicios fueron exportados específicamente para que Inventario pueda utilizarlos.

## RecetasService

Exportado desde:

```ts
RecetasModule
```

### Método disponible

```ts
obtenerIngredientesPorPlatillo(
    platilloId: number,
)
```

### ¿Qué devuelve?

Retorna la receta completa del platillo.

Ejemplo:

```ts
[
    {
        ingredienteId: 1,
        cantidadPorPorcion: 250,
        esIngredienteClave: true,
    },
    {
        ingredienteId: 2,
        cantidadPorPorcion: 120,
        esIngredienteClave: false,
    },
]
```

Este método:

* ✔ Obtiene la receta del platillo.
* ✔ Devuelve la cantidad requerida por porción.
* ✔ Indica cuáles ingredientes son clave.

Este método **NO**:

* valida stock;
* descuenta inventario;
* convierte unidades;
* realiza cálculos de disponibilidad.

Su única responsabilidad es proporcionar la receta del platillo.

---

## PlatillosService

También fue exportado para integración.

Actualmente expone el siguiente contrato:

```ts
marcarNoDisponiblePorIngrediente(
    ingredienteId: number,
)
```

Este método fue diseñado para ser invocado exclusivamente por Inventario.

Inventario **no debe modificar directamente la disponibilidad de los platillos**.

Toda la lógica relacionada con la disponibilidad pertenece al módulo Menú.

---

# Flujo esperado de integración

Cuando llegue un pedido, el flujo esperado entre ambos módulos es el siguiente:

```text
Pedido

↓

RecetasService.obtenerIngredientesPorPlatillo()

↓

Obtiene la receta del platillo

↓

Inventario descuenta el stock

↓

Inventario verifica si algún ingrediente clave llegó a cero

↓

Si ocurre

↓

PlatillosService.marcarNoDisponiblePorIngrediente()
```

Cada módulo conserva su propia responsabilidad.

---

# Cómo integrar ambos módulos

En el módulo de Inventario únicamente es necesario importar:

```ts
imports: [
    MenuModule,
    RecetasModule,
]
```

Después podrán inyectarse ambos servicios:

```ts
constructor(

    private readonly recetasService: RecetasService,

    private readonly platillosService: PlatillosService,

) {}
```

No es necesario acceder directamente a la base de datos del módulo Menú.

---

# Restricciones de integración

Para mantener una arquitectura desacoplada, Inventario **NO debe**:

❌ Inyectar:

```ts
Repository<Platillo>
```

❌ Inyectar:

```ts
Repository<RecetaIngrediente>
```

❌ Consultar directamente las tablas del módulo Menú.

❌ Actualizar manualmente el campo `disponible` de un platillo.

❌ Agregar lógica del menú dentro del módulo de Inventario.

Toda la comunicación entre ambos módulos debe realizarse mediante:

* `RecetasService`
* `PlatillosService`

---

# Dependencias entre módulos

El diseño actual busca evitar dependencias circulares.

La relación esperada es:

```text
Inventario
      │
      │ utiliza
      ▼
RecetasService

Inventario
      │
      │ utiliza
      ▼
PlatillosService
```

El módulo Menú **no depende** del módulo de Inventario.

Toda la comunicación ocurre desde Inventario hacia Menú.

---

# Contrato de responsabilidades

## Persona 2 (Menú)

Responsable de:

* Categorías.
* Platillos.
* Recetas.
* Disponibilidad de platillos.
* Reglas de negocio relacionadas con el menú.

---

## Persona 3 (Inventario)

Responsable de:

* Entidad Ingrediente.
* Gestión de stock.
* Movimientos de inventario.
* Alertas.
* Descuento de ingredientes.
* Verificación de existencias.
* Consumo de los servicios públicos expuestos por Menú.

---

# Integración futura de Ingrediente

Actualmente las recetas almacenan únicamente:

```ts
ingredienteId: number;
```

Cuando exista la entidad `Ingrediente`, únicamente deberá reemplazarse este campo por:

```ts
@ManyToOne(() => Ingrediente)
@JoinColumn({ name: 'ingrediente_id' })
ingrediente: Ingrediente;
```

El resto del código del módulo de Recetas puede mantenerse sin cambios.

Esta decisión fue tomada para permitir que ambos módulos se desarrollaran en paralelo sin generar dependencias.

---

# Estado actual

## Implementado

* ✔ CRUD de Categorías.
* ✔ CRUD de Platillos.
* ✔ Administración de Recetas.
* ✔ Relaciones TypeORM.
* ✔ JWT.
* ✔ Roles.
* ✔ Swagger.
* ✔ DTOs y validaciones.
* ✔ Servicios exportados para integración.

---

## Pendiente por Inventario

* Entidad `Ingrediente`.
* Gestión de stock.
* Movimientos.
* Alertas.
* Descuento automático de ingredientes.
* Consumo de `RecetasService.obtenerIngredientesPorPlatillo()`.
* Invocación de `PlatillosService.marcarNoDisponiblePorIngrediente()` cuando un ingrediente clave llegue a stock cero.

---

# Recomendaciones finales

* Mantener la separación entre módulos.
* Consumir únicamente los servicios públicos expuestos.
* No acceder directamente a entidades o repositorios del módulo Menú.
* Si en el futuro se requiere una nueva interacción entre ambos módulos, implementarla mediante nuevos métodos públicos en los servicios, evitando dependencias directas entre repositorios.
* Antes de reemplazar `ingredienteId` por una relación con la entidad `Ingrediente`, validar conjuntamente que el contrato entre ambos módulos se mantenga compatible.