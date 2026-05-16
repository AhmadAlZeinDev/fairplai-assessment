import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { SlackService } from '../services/slack.service';

const PG_UNIQUE_VIOLATION = '23505';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly slackService: SlackService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const errorCode =
        typeof body === 'string'
          ? body
          : (body as Record<string, unknown>).message;

      response.status(exception.getStatus()).json({
        success: false,
        errorCode,
      });
      return;
    }

    if (
      exception instanceof QueryFailedError &&
      (exception as QueryFailedError & { code: string }).code ===
        PG_UNIQUE_VIOLATION
    ) {
      response.status(409).json({
        success: false,
        errorCode: 'Duplicate entry resource already exists',
      });
      return;
    }

    const message =
      exception instanceof Error ? exception.message : String(exception);
    const stack = exception instanceof Error ? exception.stack : undefined;

    console.error(
      `Unhandled exception on ${request.method} ${request.url}`,
      stack,
    );

    void this.slackService.sendAlert(
      `*[${process.env.NODE_ENV ?? 'unknown'}] Unhandled Exception*\n\`${request.method} ${request.url}\`\n${message}`,
    );

    response.status(500).json({
      success: false,
      errorCode: 'INTERNAL_SERVER_ERROR',
    });
  }
}
