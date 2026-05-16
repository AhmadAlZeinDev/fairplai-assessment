import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ERROR_CODES } from '../common/constants/error-codes';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.usersRepo.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(ERROR_CODES.AUTH_003);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepo.findOneBy({ email });
  }

  async create(name: string, email: string, password: string): Promise<User> {
    const user = this.usersRepo.create({ name, email, password });
    return await this.usersRepo.save(user);
  }
}
