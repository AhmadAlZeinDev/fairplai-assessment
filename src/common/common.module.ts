import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { LoggingMiddleware } from './middleware/logging.middleware';
import { KinesisService } from './services/kinesis.service';
import { SlackService } from './services/slack.service';

@Module({
  imports: [HttpModule],
  providers: [
    KinesisService,
    SlackService,
    LoggingMiddleware,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
  exports: [KinesisService, SlackService, LoggingMiddleware],
})
export class CommonModule {}
