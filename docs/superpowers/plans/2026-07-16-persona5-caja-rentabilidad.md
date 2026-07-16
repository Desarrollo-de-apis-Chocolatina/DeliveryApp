# Persona 5: Caja, Rentabilidad & QA/Docs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development o superpowers:executing-plans. Cada tarea sigue superpowers:test-driven-development (RED → GREEN → REFACTOR). Estado: **EJECUTADO** (2026-07-16).

**Goal:** Módulos de Caja (cierre diario) y Rentabilidad (margen por platillo), cobertura Jest ≥ 70%, Swagger consolidado y colección Postman del flujo completo.

**Architecture:** `CajaModule` con entidad propia `Pago` (tipo de pago, propina, monto; marca el pedido `PAGADO`) que agrega los cobros del día; `RentabilidadModule` de solo lectura que cruza `Platillo` × `Receta` × `costoUnitarioPromedio`. No modifican el código de P4; consumen por repositorio/servicios exportados.

**Tech Stack:** NestJS 11, TypeORM (PostgreSQL), class-validator, @nestjs/swagger, Jest 30 + Supertest.

## Global Constraints
- Guards JWT+Roles globales (APP_GUARD): en controladores solo `@Roles(...)`, nunca `@UseGuards`.
- IDs enteros (`@PrimaryGeneratedColumn()`); `Usuario.id` es UUID → `Pago.cajeroId` es uuid.
- Decimales con `decimalTransformer`; `Platillo.precio` sin transformer → `Number()`.
- DTOs con class-validator + `@ApiProperty`; errores con excepciones nativas Nest.
- TDD estricto; `npm run test:cov` ≥ 70% con `coverageThreshold`.

## Tareas (todas completadas)
1. **Entidad `Pago` + andamiaje CajaModule** — `src/caja/entities/pago.entity.ts`, DTO, módulo, registro en AppModule. ✅
2. **`CajaService.registrarPago`** transaccional (monto desde detalles, marca PAGADO). ✅
3. **`CajaService.cierreDiario`** + endpoints `POST /caja/pagos`, `GET /caja/cierre-diario`. ✅
4. **RentabilidadModule** — `margenesPorPlatillo()`, `GET /rentabilidad/platillos`. ✅
5. **Config de cobertura** — `coveragePathIgnorePatterns`. ✅
6. **Specs del equipo** (auth, usuarios, menu, recetas, pedidos, repartidores) → cobertura 96.8% / 175 tests; `coverageThreshold` global 70. ✅
7. **E2E** del flujo + inventario insuficiente (400 + rollback), verificado contra Postgres. ✅
8. **Swagger consolidado** (@ApiOperation/@ApiResponse en pedidos/repartidores, @ApiProperty en DTOs). ✅
9. **Colección Postman** `docs/postman/DeliveryApp.postman_collection.json`. ✅
10. **Docs** (spec + este plan) y corrección del README. ✅

## Archivos clave
- `src/caja/**`, `src/rentabilidad/**`, `src/app.module.ts`, `package.json` (jest).
- Specs `*.spec.ts` en todos los módulos; `test/flujo-restaurante.e2e-spec.ts`.
- Swagger: controllers de pedidos/repartidores; DTOs de menu/inventario/recetas.
- `docs/postman/DeliveryApp.postman_collection.json`.

## Verificación end-to-end (realizada)
1. `docker compose up -d db` (si el 5432 está ocupado, usar `docker-compose.override.yml` local → 5433).
2. `npm run test:cov` → 96.8% statements, 175 tests, umbral 70% forzado (verde).
3. `npm run test:e2e` → 7 tests verdes, incl. inventario insuficiente con rollback.
4. Swagger en `/api/docs`; colección Postman ejecutable con el flujo de demo.

## Ejecución
Ejecutado inline con TDD (alternativa executing-plans). Los specs de módulos ajenos (Task 6) y la consolidación de Swagger (Task 8) se paralelizaron con subagentes; el resto se implementó paso a paso con RED→GREEN y commit por tarea.
