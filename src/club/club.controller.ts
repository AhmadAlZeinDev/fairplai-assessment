import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ClubService } from './club.service';
import { CreateClubDto } from './dto/create-club.dto';
import { ListClubsQueryDto } from './dto/list-clubs-query.dto';
import { UpdateClubDto } from './dto/update-club.dto';

@ApiTags('Clubs')
@ApiBearerAuth()
@Controller('clubs')
export class ClubController {
  constructor(private readonly clubService: ClubService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new club' })
  @ApiCreatedResponse({ description: 'Club created successfully' })
  @ApiConflictResponse({ description: 'CLUB_002: Club name already exists' })
  async create(@Body() dto: CreateClubDto) {
    return await this.clubService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all clubs (paginated)' })
  @ApiOkResponse({ description: 'Paginated list of clubs' })
  async findAll(@Query() query: ListClubsQueryDto) {
    return await this.clubService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a club by ID' })
  @ApiOkResponse({ description: 'Club found' })
  @ApiNotFoundResponse({ description: 'CLUB_001: Club not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.clubService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a club' })
  @ApiOkResponse({ description: 'Club updated successfully' })
  @ApiNotFoundResponse({ description: 'CLUB_001: Club not found' })
  @ApiConflictResponse({ description: 'CLUB_002: Club name already exists' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClubDto,
  ) {
    return await this.clubService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a club' })
  @ApiNoContentResponse({ description: 'Club deleted successfully' })
  @ApiNotFoundResponse({ description: 'CLUB_001: Club not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return await this.clubService.remove(id);
  }
}
