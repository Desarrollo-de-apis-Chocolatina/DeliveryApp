import { PartialType } from '@nestjs/swagger';
import { CreatePlatilloDto } from './create-platillo.dto';

export class UpdatePlatilloDto extends PartialType(CreatePlatilloDto) {}
