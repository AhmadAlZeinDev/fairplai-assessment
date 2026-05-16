import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ArrayContains, FindOptionsWhere, Repository } from 'typeorm';
import { ERROR_CODES } from '../common/constants/error-codes';
import { Club } from './entities/club.entity';
import { CreateClubDto } from './dto/create-club.dto';
import { ListClubsQueryDto } from './dto/list-clubs-query.dto';
import { UpdateClubDto } from './dto/update-club.dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}

@Injectable()
export class ClubService {
  constructor(
    @InjectRepository(Club)
    private readonly clubRepo: Repository<Club>,
  ) {}

  async create(dto: CreateClubDto): Promise<Club> {
    const existing = await this.clubRepo.findOneBy({ name: dto.name });
    if (existing) {
      throw new ConflictException(ERROR_CODES.CLUB_002);
    }

    const club = this.clubRepo.create(dto);
    return await this.clubRepo.save(club);
  }

  async findAll(query: ListClubsQueryDto): Promise<PaginatedResult<Club>> {
    const { page, perPage, sortBy, sortOrder, sport } = query;
    const skip = (page - 1) * perPage;

    const allowedSortFields: (keyof Club)[] = [
      'name',
      'country',
      'city',
      'createdAt',
    ];
    const field =
      sortBy && allowedSortFields.includes(sortBy as keyof Club)
        ? sortBy
        : 'createdAt';

    const where: FindOptionsWhere<Club> = sport
      ? { sports: ArrayContains([sport]) }
      : {};

    const [data, total] = await this.clubRepo.findAndCount({
      where,
      order: { [field]: sortOrder },
      skip,
      take: perPage,
    });
    return { data, total, page, perPage };
  }

  async findOne(id: string): Promise<Club> {
    const club = await this.clubRepo.findOneBy({ id });
    if (!club) {
      throw new NotFoundException(ERROR_CODES.CLUB_001);
    }
    return club;
  }

  async update(id: string, dto: UpdateClubDto): Promise<Club> {
    const club = await this.findOne(id);

    if (dto.name && dto.name !== club.name) {
      const existing = await this.clubRepo.findOneBy({ name: dto.name });
      if (existing) {
        throw new ConflictException(ERROR_CODES.CLUB_002);
      }
    }

    Object.assign(club, dto);
    return await this.clubRepo.save(club);
  }

  async remove(id: string): Promise<void> {
    const club = await this.clubRepo.findOneBy({ id });
    if (!club) return;
    await this.clubRepo.softRemove(club);
  }
}
