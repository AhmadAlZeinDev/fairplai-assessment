import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Sport } from '../../common/enums/sport.enum';

export class ListClubsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Sport, description: 'Filter by sport' })
  @IsOptional()
  @IsEnum(Sport)
  sport?: Sport;
}
