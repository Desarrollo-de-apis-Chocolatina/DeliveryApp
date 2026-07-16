import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { validate } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { MenuModule } from './menu/menu.module';
import { RecetasModule } from './recetas/recetas.module';
import { CategoriasModule } from './menu/categorias/categorias.module';
import { PlatillosModule } from './menu/platillos/platillos.module';
import { InventarioModule } from './inventario/inventario.module';
import { PedidosDeliveryModule } from './pedidos-delivery/pedidos-delivery.module';
import { PedidosMesaModule } from './pedidos-mesa/pedidos-mesa.module';
import { RepartidoresModule } from './repartidores/repartidores.module';
import { CajaModule } from './caja/caja.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // ConfigModule global: disponible en todos los módulos sin importarlo de nuevo
    ConfigModule.forRoot({
      isGlobal: true,
      // Valida variables de entorno al arrancar. Si falta alguna, la app no inicia.
      validate,
    }),

    // Módulo de conexión a PostgreSQL con TypeORM
    DatabaseModule,

    // Módulos de negocio de Persona 1
    AuthModule,
    UsuariosModule,

    // Módulos de negocio de Persona 2
    MenuModule,
    CategoriasModule,
    PlatillosModule,
    RecetasModule,

    // Los módulos de las otras personas se agregan aquí cuando los entreguen:
    InventarioModule,
    // MenuModule,         <- Persona 2
    PedidosMesaModule,
    PedidosDeliveryModule,
    RepartidoresModule,
    CajaModule, // <- Persona 5
    // RentabilidadModule, <- Persona 5
  ],
  controllers: [AppController],
  providers: [
    AppService,

    /**
     * Guards globales — aplican a TODOS los endpoints sin necesitar @UseGuards().
     *
     * Orden importante:
     * 1. JwtAuthGuard: verifica el token JWT (o permite paso si @Public())
     * 2. RolesGuard: verifica el rol del usuario (req.user ya disponible)
     */
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}