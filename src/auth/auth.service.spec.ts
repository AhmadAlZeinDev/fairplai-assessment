import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

const mockUser = () => ({
  id: 'uuid-1',
  name: 'John Doe',
  email: 'john@example.com',
  password: 'hashed',
});

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('token') },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  describe('register', () => {
    it('returns an access token on happy path', async () => {
      const user = mockUser();
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(user as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      const result = await service.register({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'secret123',
      });

      expect(result).toEqual({ accessToken: 'token' });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
      });
    });

    it('throws ConflictException when email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser() as any);

      await expect(
        service.register({
          name: 'John',
          email: 'john@example.com',
          password: 'secret123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('propagates error when bcrypt fails (handled by global filter)', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('bcrypt error'));

      await expect(
        service.register({
          name: 'John',
          email: 'john@example.com',
          password: 'secret123',
        }),
      ).rejects.toThrow('bcrypt error');
    });
  });

  describe('login', () => {
    it('returns an access token on happy path', async () => {
      const user = mockUser();
      usersService.findByEmail.mockResolvedValue(user as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'john@example.com',
        password: 'secret123',
      });

      expect(result).toEqual({ accessToken: 'token' });
    });

    it('throws UnauthorizedException when user is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@example.com', password: 'secret123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is incorrect', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser() as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'john@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
