import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASS'),
        database: config.get<string>('DB_NAME'),
        // Cada módulo registra sus propias entidades con TypeOrmModule.forFeature()
        // y este flag las carga automáticamente sin necesitar listarlas aquí.
        autoLoadEntities: true,
        // Solo desarrollo: TypeORM sincroniza el schema automáticamente.
        // En producción se deben usar migraciones.
        synchronize: true,
        logging: ['error', 'warn'],
      }),
    }),
  ],
})
export class DatabaseModule {}
