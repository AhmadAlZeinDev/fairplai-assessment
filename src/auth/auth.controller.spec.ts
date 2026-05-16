import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

const mockAuthResult = {
  accessToken: 'token',
  user: { id: 'uuid-1', name: 'John', email: 'john@example.com' },
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn().mockResolvedValue(mockAuthResult),
            login: jest.fn().mockResolvedValue(mockAuthResult),
          },
        },
        {
          provide: UsersService,
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('delegates to AuthService and returns the result', async () => {
      const dto = { name: 'John', email: 'john@example.com', password: 'secret123' };
      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockAuthResult);
    });
  });

  describe('login', () => {
    it('delegates to AuthService and returns the result', async () => {
      const dto = { email: 'john@example.com', password: 'secret123' };
      const result = await controller.login(dto);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockAuthResult);
    });
  });
});
