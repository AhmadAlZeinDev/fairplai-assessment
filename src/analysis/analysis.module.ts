import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalysisController } from './analysis.controller';
import { AnalysisJob } from './entities/analysis-job.entity';
import { AnalysisService } from './analysis.service';

@Module({
  imports: [TypeOrmModule.forFeature([AnalysisJob]), HttpModule],
  controllers: [AnalysisController],
  providers: [AnalysisService],
})
export class AnalysisModule {}
