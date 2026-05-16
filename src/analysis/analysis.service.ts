import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, timingSafeEqual } from 'crypto';
import { firstValueFrom } from 'rxjs';
import { In, Repository } from 'typeorm';
import { ERROR_CODES } from '../common/constants/error-codes';
import { AnalysisJob } from './entities/analysis-job.entity';
import { TriggerAnalysisDto } from './dto/trigger-analysis.dto';
import { WebhookPayloadDto, WebhookStatus } from './dto/webhook-payload.dto';
import { AnalysisStatus } from './enums/analysis-status.enum';

interface AiModuleResponse {
  jobId: string;
}

export interface TriggerResult {
  jobId: string;
  status: AnalysisStatus;
}

@Injectable()
export class AnalysisService {
  constructor(
    @InjectRepository(AnalysisJob)
    private readonly jobRepo: Repository<AnalysisJob>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async trigger(dto: TriggerAnalysisDto): Promise<TriggerResult> {
    if (!dto.sessionId && !dto.matchId) {
      throw new BadRequestException(
        'At least one of sessionId or matchId must be provided',
      );
    }

    const duplicate = await this.findActiveJob(dto.sessionId, dto.matchId);
    if (duplicate) {
      throw new ConflictException(ERROR_CODES.ANALYSIS_002);
    }

    const aiUrl = this.configService.getOrThrow<string>('AI_MODULE_URL');

    let externalJobId: string | null = null;
    let jobStatus = AnalysisStatus.PENDING;
    let errorMessage: string | null = null;

    try {
      const response = await firstValueFrom(
        this.httpService.post<AiModuleResponse>(`${aiUrl}/analyze`, {
          videoUrl: dto.videoUrl,
          sessionId: dto.sessionId,
          matchId: dto.matchId,
          metadata: dto.metadata,
        }),
      );
      externalJobId = response.data.jobId;
    } catch (err) {
      jobStatus = AnalysisStatus.FAILED;
      errorMessage =
        err instanceof Error ? err.message : 'AI service request failed';
    }

    const job = this.jobRepo.create({
      sessionId: dto.sessionId ?? null,
      matchId: dto.matchId ?? null,
      videoUrl: dto.videoUrl,
      status: jobStatus,
      externalJobId,
      errorMessage,
      attempts: jobStatus === AnalysisStatus.FAILED ? 1 : 0,
    });

    const saved = await this.jobRepo.save(job);

    if (jobStatus === AnalysisStatus.FAILED) {
      throw new ConflictException(ERROR_CODES.ANALYSIS_004);
    }

    return { jobId: saved.id, status: saved.status };
  }

  async handleWebhook(
    signature: string,
    rawBody: Buffer,
    payload: WebhookPayloadDto,
  ): Promise<void> {
    this.verifySignature(signature, rawBody);

    const job = await this.jobRepo.findOneBy({
      externalJobId: payload.externalJobId,
    });

    if (!job) {
      return;
    }

    if (job.status === AnalysisStatus.COMPLETED) {
      return;
    }

    if (payload.status === WebhookStatus.SUCCESS) {
      job.status = AnalysisStatus.COMPLETED;
      job.result = payload.result ?? null;
      job.externalJobId = payload.externalJobId;
    } else {
      job.status = AnalysisStatus.FAILED;
      job.errorMessage =
        payload.errorMessage ?? 'Unknown error from AI service';
      job.attempts += 1;
    }

    await this.jobRepo.save(job);
  }

  async findJob(jobId: string): Promise<AnalysisJob> {
    const job = await this.jobRepo.findOneBy({ id: jobId });
    if (!job) {
      throw new NotFoundException(ERROR_CODES.ANALYSIS_001);
    }
    return job;
  }

  private verifySignature(signature: string, rawBody: Buffer): void {
    const secret = this.configService.getOrThrow<string>('WEBHOOK_SECRET');
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

    try {
      const sigBuf = Buffer.from(signature, 'hex');
      const expBuf = Buffer.from(expected, 'hex');
      if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
        throw new UnauthorizedException(ERROR_CODES.ANALYSIS_003);
      }
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException(ERROR_CODES.ANALYSIS_003);
    }
  }

  private async findActiveJob(
    sessionId: string | undefined,
    matchId: string | undefined,
  ): Promise<AnalysisJob | null> {
    const activeStatuses = [AnalysisStatus.PENDING, AnalysisStatus.PROCESSING];

    if (sessionId) {
      const job = await this.jobRepo.findOne({
        where: { sessionId, status: In(activeStatuses) },
      });
      if (job) return job;
    }

    if (matchId) {
      return await this.jobRepo.findOne({
        where: { matchId, status: In(activeStatuses) },
      });
    }

    return null;
  }
}
