import { Test, TestingModule } from '@nestjs/testing';
import { SortOrder } from '../common/dto/pagination-query.dto';
import { Sport } from '../common/enums/sport.enum';
import { ClubController } from './club.controller';
import { ClubService } from './club.service';

const FIXED_DATE = new Date('2024-01-01T00:00:00.000Z');

const MOCK_CLUB = {
  id: 'uuid-1',
  name: 'Real Madrid',
  sports: [Sport.FOOTBALL],
  country: 'Spain',
  city: 'Madrid',
  isActive: true,
  createdAt: FIXED_DATE,
  updatedAt: FIXED_DATE,
  deletedAt: null,
};

const MOCK_PAGINATED = {
  data: [MOCK_CLUB],
  total: 1,
  page: 1,
  perPage: 10,
};

describe('ClubController', () => {
  let controller: ClubController;
  let clubService: jest.Mocked<ClubService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClubController],
      providers: [
        {
          provide: ClubService,
          useValue: {
            create: jest.fn().mockResolvedValue(MOCK_CLUB),
            findAll: jest.fn().mockResolvedValue(MOCK_PAGINATED),
            findOne: jest.fn().mockResolvedValue(MOCK_CLUB),
            update: jest.fn().mockResolvedValue(MOCK_CLUB),
            remove: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<ClubController>(ClubController);
    clubService = module.get(ClubService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('delegates to ClubService and returns the result', async () => {
      const dto = {
        name: 'Real Madrid',
        sports: [Sport.FOOTBALL],
        country: 'Spain',
        city: 'Madrid',
      };
      const result = await controller.create(dto);

      expect(clubService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(MOCK_CLUB);
    });
  });

  describe('findAll', () => {
    it('delegates to ClubService and returns paginated result', async () => {
      const query = { page: 1, perPage: 10, sortOrder: SortOrder.ASC };
      const result = await controller.findAll(query);

      expect(clubService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(MOCK_PAGINATED);
    });
  });

  describe('findOne', () => {
    it('delegates to ClubService and returns the club', async () => {
      const result = await controller.findOne('uuid-1');

      expect(clubService.findOne).toHaveBeenCalledWith('uuid-1');
      expect(result).toEqual(MOCK_CLUB);
    });
  });

  describe('update', () => {
    it('delegates to ClubService and returns the updated club', async () => {
      const dto = { city: 'Barcelona' };
      const result = await controller.update('uuid-1', dto);

      expect(clubService.update).toHaveBeenCalledWith('uuid-1', dto);
      expect(result).toEqual(MOCK_CLUB);
    });
  });

  describe('remove', () => {
    it('delegates to ClubService', async () => {
      await controller.remove('uuid-1');
      expect(clubService.remove).toHaveBeenCalledWith('uuid-1');
    });
  });
});
