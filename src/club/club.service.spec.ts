import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sport } from '../common/enums/sport.enum';
import { ClubService } from './club.service';
import { Club } from './entities/club.entity';
import { SortOrder } from '../common/dto/pagination-query.dto';

const mockClub = (): Club => ({
  id: 'uuid-1',
  name: 'Real Madrid',
  sports: [Sport.FOOTBALL],
  country: 'Spain',
  city: 'Madrid',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
});

type MockRepo = Partial<Record<keyof Repository<Club>, jest.Mock>>;

const createMockRepo = (): MockRepo => ({
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  softRemove: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('ClubService', () => {
  let service: ClubService;
  let repo: MockRepo;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClubService,
        { provide: getRepositoryToken(Club), useValue: createMockRepo() },
      ],
    }).compile();

    service = module.get<ClubService>(ClubService);
    repo = module.get(getRepositoryToken(Club));
  });

  describe('create', () => {
    it('creates and returns a club on happy path', async () => {
      const club = mockClub();
      repo.findOneBy!.mockResolvedValue(null);
      repo.create!.mockReturnValue(club);
      repo.save!.mockResolvedValue(club);

      const result = await service.create({
        name: 'Real Madrid',
        sports: [Sport.FOOTBALL],
        country: 'Spain',
        city: 'Madrid',
      });

      expect(result).toEqual(club);
      expect(repo.save).toHaveBeenCalledWith(club);
    });

    it('throws ConflictException when club name already exists', async () => {
      repo.findOneBy!.mockResolvedValue(mockClub());

      await expect(
        service.create({
          name: 'Real Madrid',
          sports: [Sport.FOOTBALL],
          country: 'Spain',
          city: 'Madrid',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('returns paginated clubs', async () => {
      const club = mockClub();
      const qb = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[club], 1]),
      };
      repo.createQueryBuilder!.mockReturnValue(qb);

      const result = await service.findAll({
        page: 1,
        perPage: 10,
        sortOrder: SortOrder.ASC,
      });

      expect(result.data).toEqual([club]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.perPage).toBe(10);
    });
  });

  describe('findOne', () => {
    it('returns the club when found', async () => {
      const club = mockClub();
      repo.findOneBy!.mockResolvedValue(club);

      const result = await service.findOne('uuid-1');
      expect(result).toEqual(club);
    });

    it('throws NotFoundException when club does not exist', async () => {
      repo.findOneBy!.mockResolvedValue(null);
      await expect(service.findOne('uuid-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates and returns the club on happy path', async () => {
      const club = mockClub();
      repo.findOneBy!.mockResolvedValue(club);
      repo.save!.mockResolvedValue({ ...club, city: 'Barcelona' });

      const result = await service.update('uuid-1', { city: 'Barcelona' });
      expect(result.city).toBe('Barcelona');
    });

    it('throws NotFoundException when club does not exist', async () => {
      repo.findOneBy!.mockResolvedValue(null);
      await expect(
        service.update('uuid-1', { city: 'Barcelona' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes the club on happy path', async () => {
      const club = mockClub();
      repo.findOneBy!.mockResolvedValue(club);
      repo.softRemove!.mockResolvedValue(undefined);

      await expect(service.remove('uuid-1')).resolves.toBeUndefined();
      expect(repo.softRemove).toHaveBeenCalledWith(club);
    });

    it('throws NotFoundException when club does not exist', async () => {
      repo.findOneBy!.mockResolvedValue(null);
      await expect(service.remove('uuid-1')).rejects.toThrow(NotFoundException);
    });
  });
});
