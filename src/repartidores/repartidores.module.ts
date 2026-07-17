import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepartidoresService } from './repartidores.service';
import { RepartidoresController } from './repartidores.controller';
import { Repartidor } from './entities/repartidor.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Repartidor, Usuario])],
  controllers: [RepartidoresController],
  providers: [RepartidoresService],
  exports: [RepartidoresService],
})
export class RepartidoresModule {}
