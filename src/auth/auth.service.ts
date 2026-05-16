import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ERROR_CODES } from '../common/constants/error-codes';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type AuthResult = { accessToken: string; user: Omit<User, 'password'> };

@Injectable()
export class AuthService {
  private readonly salt: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.salt = this.configService.get<number>('BCRYPT_SALT', 10);
  }

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException(ERROR_CODES.AUTH_002);
    }

    const hashed = await bcrypt.hash(dto.password, +this.salt);
    const user = await this.usersService.create(dto.name, dto.email, hashed);

    return this.buildAuthResult(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException(ERROR_CODES.AUTH_001);
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException(ERROR_CODES.AUTH_001);
    }

    return this.buildAuthResult(user);
  }

  private buildAuthResult(user: User): AuthResult {
    const { password: _, ...safeUser } = user;
    return {
      accessToken: this.jwtService.sign({ sub: user.id, email: user.email }),
      user: safeUser,
    };
  }
}
