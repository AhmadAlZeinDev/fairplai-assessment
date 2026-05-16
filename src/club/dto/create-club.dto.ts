import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsEnum, IsString } from 'class-validator';
import { Sport } from '../../common/enums/sport.enum';

export class CreateClubDto {
  @ApiProperty({ example: 'Real Madrid' })
  @IsString()
  name: string;

  @ApiProperty({
    enum: Sport,
    isArray: true,
    example: [Sport.FOOTBALL, Sport.BASKETBALL],
    description: 'At least one sport is required',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(Sport, { each: true })
  sports: Sport[];

  @ApiProperty({ example: 'Spain' })
  @IsString()
  country: string;

  @ApiProperty({ example: 'Madrid' })
  @IsString()
  city: string;
}
