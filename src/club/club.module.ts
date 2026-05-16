import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClubController } from './club.controller';
import { Club } from './entities/club.entity';
import { ClubService } from './club.service';

@Module({
  imports: [TypeOrmModule.forFeature([Club])],
  controllers: [ClubController],
  providers: [ClubService],
})
export class ClubModule {}
