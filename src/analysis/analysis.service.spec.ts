import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createHmac } from 'crypto';
import { of, throwError } from 'rxjs';
import { AnalysisJob } from './entities/analysis-job.entity';
import { AnalysisService } from './analysis.service';
import { WebhookStatus } from './dto/webhook-payload.dto';
import { AnalysisStatus } from './enums/analysis-status.enum';

const WEBHOOK_SECRET = 'test-secret';

const makeSignature = (body: Buffer): string =>
  createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');

const mockJob = (overrides: Partial<AnalysisJob> = {}): AnalysisJob => ({
  id: 'job-uuid-1',
  sessionId: 'session-uuid-1',
  matchId: null,
  videoUrl: 'https://example.com/video.mp4',
  status: AnalysisStatus.PENDING,
  externalJobId: 'ext-job-1',
  result: null,
  attempts: 0,
  errorMessage: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

type MockRepo = {
  findOne: jest.Mock;
  findOneBy: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

const createMockRepo = (): MockRepo => ({
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe('AnalysisService', () => {
  let service: AnalysisService;
  let repo: MockRepo;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysisService,
        {
          provide: getRepositoryToken(AnalysisJob),
          useValue: createMockRepo(),
        },
        {
          provide: HttpService,
          useValue: { post: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'AI_MODULE_URL') return 'https://ai.example.com';
              if (key === 'WEBHOOK_SECRET') return WEBHOOK_SECRET;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AnalysisService>(AnalysisService);
    repo = module.get(getRepositoryToken(AnalysisJob));
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);
  });

  describe('trigger', () => {
    it('creates a PENDING job and returns jobId on happy path', async () => {
      const job = mockJob();
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(job);
      repo.save.mockResolvedValue(job);
      httpService.post.mockReturnValue(
        of({ data: { jobId: 'ext-job-1' } } as any),
      );

      const result = await service.trigger({
        sessionId: 'session-uuid-1',
        videoUrl: 'https://example.com/video.mp4',
      });

      expect(result).toEqual({ jobId: job.id, status: AnalysisStatus.PENDING });
      expect(repo.save).toHaveBeenCalled();
    });

    it('throws BadRequestException when neither sessionId nor matchId provided', async () => {
      await expect(
        service.trigger({ videoUrl: 'https://example.com/video.mp4' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when an active job already exists', async () => {
      repo.findOne.mockResolvedValue(
        mockJob({ status: AnalysisStatus.PROCESSING }),
      );

      await expect(
        service.trigger({
          sessionId: 'session-uuid-1',
          videoUrl: 'https://example.com/video.mp4',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates a FAILED job and throws ConflictException when AI service is unavailable', async () => {
      const failedJob = mockJob({ status: AnalysisStatus.FAILED, attempts: 1 });
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(failedJob);
      repo.save.mockResolvedValue(failedJob);
      httpService.post.mockReturnValue(
        throwError(() => new Error('Connection refused')),
      );

      await expect(
        service.trigger({
          sessionId: 'session-uuid-1',
          videoUrl: 'https://example.com/video.mp4',
        }),
      ).rejects.toThrow(ConflictException);

      expect(repo.save).toHaveBeenCalled();
    });
  });

  describe('handleWebhook', () => {
    it('marks job COMPLETED on happy path', async () => {
      const job = mockJob();
      repo.findOneBy.mockResolvedValue(job);
      repo.save.mockResolvedValue({ ...job, status: AnalysisStatus.COMPLETED });

      const payload = {
        externalJobId: 'ext-job-1',
        status: WebhookStatus.SUCCESS,
        result: { score: 99 },
      };
      const body = Buffer.from(JSON.stringify(payload));

      await service.handleWebhook(makeSignature(body), body, payload);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: AnalysisStatus.COMPLETED }),
      );
    });

    it('throws UnauthorizedException on invalid signature', async () => {
      const payload = {
        externalJobId: 'ext-job-1',
        status: WebhookStatus.SUCCESS,
      };
      const body = Buffer.from(JSON.stringify(payload));

      await expect(
        service.handleWebhook('bad-signature', body, payload),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('silently returns without updating when job is already COMPLETED (idempotency)', async () => {
      const job = mockJob({ status: AnalysisStatus.COMPLETED });
      repo.findOneBy.mockResolvedValue(job);

      const payload = {
        externalJobId: 'ext-job-1',
        status: WebhookStatus.SUCCESS,
      };
      const body = Buffer.from(JSON.stringify(payload));

      await service.handleWebhook(makeSignature(body), body, payload);

      expect(repo.save).not.toHaveBeenCalled();
    });

    it('silently returns without throwing when externalJobId is unknown (out-of-order)', async () => {
      repo.findOneBy.mockResolvedValue(null);

      const payload = {
        externalJobId: 'unknown-ext-id',
        status: WebhookStatus.SUCCESS,
      };
      const body = Buffer.from(JSON.stringify(payload));

      await expect(
        service.handleWebhook(makeSignature(body), body, payload),
      ).resolves.toBeUndefined();

      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('findJob', () => {
    it('returns the job when found', async () => {
      const job = mockJob();
      repo.findOneBy.mockResolvedValue(job);

      const result = await service.findJob('job-uuid-1');
      expect(result).toEqual(job);
    });

    it('throws NotFoundException when job does not exist', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.findJob('job-uuid-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
