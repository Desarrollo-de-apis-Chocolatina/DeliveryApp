import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
  ) {}

  async create(dto: CreateUsuarioDto): Promise<Usuario> {
    const existe = await this.usuarioRepo.findOne({
      where: { email: dto.email },
    });
    if (existe) {
      throw new ConflictException(
        `Ya existe un usuario con el email ${dto.email}`,
      );
    }
    // El hash del password se aplica automáticamente en @BeforeInsert
    const usuario = this.usuarioRepo.create(dto);
    return this.usuarioRepo.save(usuario);
  }

  async findAll(): Promise<Usuario[]> {
    return this.usuarioRepo.find({ where: { activo: true } });
  }

  async findOne(id: string): Promise<Usuario> {
    const usuario = await this.usuarioRepo.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }
    return usuario;
  }

  /**
   * Usado internamente por AuthService para validar credenciales.
   * Usa addSelect para obtener el password (select: false en la entidad).
   */
  async findByEmail(email: string): Promise<Usuario | null> {
    return this.usuarioRepo
      .createQueryBuilder('usuario')
      .addSelect('usuario.password')
      .where('usuario.email = :email', { email })
      .getOne();
  }

  async update(id: string, dto: UpdateUsuarioDto): Promise<Usuario> {
    const usuario = await this.findOne(id);
    Object.assign(usuario, dto);
    // Si se actualizó el password, @BeforeUpdate lo hashea automáticamente
    return this.usuarioRepo.save(usuario);
  }

  /**
   * Soft-disable: marca activo = false, no borra el registro.
   * Preserva integridad referencial con pedidos, cierres de caja, etc.
   */
  async remove(id: string): Promise<{ message: string }> {
    const usuario = await this.findOne(id);
    usuario.activo = false;
    await this.usuarioRepo.save(usuario);
    return { message: `Usuario ${usuario.email} desactivado correctamente` };
  }
}
