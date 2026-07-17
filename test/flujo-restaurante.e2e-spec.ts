import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { globalValidationPipe } from './../src/common/pipes/validation.pipe';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';
import { Usuario, Rol } from './../src/usuarios/entities/usuario.entity';

/**
 * E2E del flujo completo del restaurante, incluyendo el escenario clave de la
 * rúbrica: intentar pasar a LISTO un pedido cuyo inventario es insuficiente
 * debe responder 400 y NO alterar el stock (rollback transaccional).
 *
 * Requiere una base de datos PostgreSQL accesible (ver .env). El esquema se
 * recrea al inicio con synchronize(true) para partir de un estado limpio.
 */
describe('Flujo Restaurante (e2e)', () => {
  let app: INestApplication;
  let token: string;

  let carneId: number;
  let tomateId: number;
  let categoriaId: number;
  let platilloId: number;
  let pedidoId: number;
  let pedidoInsuficienteId: number;

  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(globalValidationPipe);
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    // Estado limpio: recrea todas las tablas.
    const dataSource = app.get(DataSource);
    await dataSource.synchronize(true);

    // Crea un admin (puede ejecutar todo el flujo) y obtiene su token.
    await dataSource.getRepository(Usuario).save(
      dataSource.getRepository(Usuario).create({
        nombre: 'Admin E2E',
        email: 'admin_e2e@delivery.com',
        password: 'admin123',
        rol: Rol.ADMIN,
      }),
    );

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin_e2e@delivery.com', password: 'admin123' });
    token = login.body.access_token;
    expect(token).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });

  it('crea ingredientes', async () => {
    const carne = await request(app.getHttpServer())
      .post('/api/inventario/ingredientes')
      .set(auth())
      .send({ nombre: 'Carne', unidadMedida: 'kg', stock: 5, stockMinimo: 1, costoUnitario: 8 })
      .expect(201);
    carneId = carne.body.id;

    const tomate = await request(app.getHttpServer())
      .post('/api/inventario/ingredientes')
      .set(auth())
      .send({ nombre: 'Tomate', unidadMedida: 'kg', stock: 10, stockMinimo: 2, costoUnitario: 2 })
      .expect(201);
    tomateId = tomate.body.id;
  });

  it('crea categoría y platillo', async () => {
    const categoria = await request(app.getHttpServer())
      .post('/api/menu/categorias')
      .set(auth())
      .send({ nombre: 'Hamburguesas', descripcion: 'Gourmet' })
      .expect(201);
    categoriaId = categoria.body.id;

    const platillo = await request(app.getHttpServer())
      .post('/api/menu/platillos')
      .set(auth())
      .send({ nombre: 'Hamburguesa Especial', descripcion: 'Doble', precio: 12.5, categoriaId })
      .expect(201);
    platilloId = platillo.body.id;
  });

  it('crea la receta del platillo', async () => {
    await request(app.getHttpServer())
      .post(`/api/recetas/platillo/${platilloId}`)
      .set(auth())
      .send({
        ingredientes: [
          { ingredienteId: carneId, cantidadPorPorcion: 0.2, esIngredienteClave: true },
          { ingredienteId: tomateId, cantidadPorPorcion: 0.05, esIngredienteClave: false },
        ],
      })
      .expect(201);
  });

  it('crea un pedido en mesa y lo pasa a EN_COCINA y luego a LISTO (descuenta stock)', async () => {
    const pedido = await request(app.getHttpServer())
      .post('/api/pedidos-mesa')
      .set(auth())
      .send({ numeroMesa: 5, detalles: [{ platilloId, cantidad: 2 }] })
      .expect(201);
    pedidoId = pedido.body.id;

    await request(app.getHttpServer())
      .patch(`/api/pedidos-mesa/${pedidoId}/estado`)
      .set(auth())
      .send({ estado: 'EN_COCINA' })
      .expect(200);

    const listo = await request(app.getHttpServer())
      .patch(`/api/pedidos-mesa/${pedidoId}/estado`)
      .set(auth())
      .send({ estado: 'LISTO' })
      .expect(200);
    expect(listo.body.estado).toBe('LISTO');

    // 2 porciones * 0.2 kg = 0.4 kg descontados => 5 - 0.4 = 4.6
    const carne = await request(app.getHttpServer())
      .get(`/api/inventario/ingredientes/${carneId}`)
      .set(auth())
      .expect(200);
    expect(Number(carne.body.stock)).toBe(4.6);
  });

  it('rechaza pasar a LISTO un pedido con inventario insuficiente (400) sin corromper el stock', async () => {
    const pedido = await request(app.getHttpServer())
      .post('/api/pedidos-mesa')
      .set(auth())
      .send({ numeroMesa: 6, detalles: [{ platilloId, cantidad: 100 }] })
      .expect(201);
    pedidoInsuficienteId = pedido.body.id;

    await request(app.getHttpServer())
      .patch(`/api/pedidos-mesa/${pedidoInsuficienteId}/estado`)
      .set(auth())
      .send({ estado: 'EN_COCINA' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .patch(`/api/pedidos-mesa/${pedidoInsuficienteId}/estado`)
      .set(auth())
      .send({ estado: 'LISTO' })
      .expect(400);
    expect(JSON.stringify(res.body)).toContain('insuficiente');

    // El stock de Carne debe seguir en 4.6 (rollback): el pedido imposible no lo tocó.
    const carne = await request(app.getHttpServer())
      .get(`/api/inventario/ingredientes/${carneId}`)
      .set(auth())
      .expect(200);
    expect(Number(carne.body.stock)).toBe(4.6);
  });

  it('cobra el pedido y genera cierre de caja y rentabilidad', async () => {
    const pago = await request(app.getHttpServer())
      .post('/api/caja/pagos')
      .set(auth())
      .send({ canal: 'MESA', pedidoId, tipoPago: 'TARJETA', propina: 2.5 })
      .expect(201);
    expect(Number(pago.body.monto)).toBe(25); // 2 * 12.50

    const fecha = new Date().toISOString().slice(0, 10);
    const cierre = await request(app.getHttpServer())
      .get(`/api/caja/cierre-diario?fecha=${fecha}`)
      .set(auth())
      .expect(200);
    expect(Number(cierre.body.ventasTotales)).toBe(25);
    expect(Number(cierre.body.propinasTotales)).toBe(2.5);
    expect(Number(cierre.body.porTipoPago.TARJETA)).toBe(25);

    const rent = await request(app.getHttpServer())
      .get('/api/rentabilidad/platillos')
      .set(auth())
      .expect(200);
    const fila = rent.body.find((r: { platilloId: number }) => r.platilloId === platilloId);
    expect(fila).toBeDefined();
    // costo receta = 0.2*8 + 0.05*2 = 1.7 ; margen = 12.5 - 1.7 = 10.8
    expect(fila.costoReceta).toBeCloseTo(1.7, 5);
    expect(fila.margenNominal).toBeCloseTo(10.8, 5);
  });
});
