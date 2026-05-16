import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { KinesisService } from '../services/kinesis.service';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggingMiddleware.name);

  constructor(private readonly kinesisService: KinesisService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const { method, url, ip } = req;

    res.on('finish', () => {
      const durationMs = Date.now() - start;
      const record = {
        timestamp: new Date().toISOString(),
        method,
        url,
        ip,
        statusCode: res.statusCode,
        durationMs,
      };
      this.logger.log(`${method} ${url} ${res.statusCode} ${durationMs}ms`);
      void this.kinesisService.putRecord(record);
    });

    next();
  }
}
