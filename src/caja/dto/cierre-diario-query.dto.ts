import { IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CierreDiarioQueryDto {
  @ApiProperty({
    description: 'Fecha del cierre en formato YYYY-MM-DD.',
    example: '2026-07-16',
  })
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fecha debe tener el formato YYYY-MM-DD',
  })
  fecha: string;
}
