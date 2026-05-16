import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExcludeEndpoint,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { AnalysisService } from './analysis.service';
import { TriggerAnalysisDto } from './dto/trigger-analysis.dto';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';

@ApiTags('Analysis')
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('trigger')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Trigger AI analysis for a match or training session',
  })
  @ApiResponse({
    status: 202,
    description: 'Analysis job accepted processing asynchronously',
  })
  @ApiResponse({
    status: 400,
    description: 'Neither sessionId nor matchId provided',
  })
  @ApiResponse({
    status: 409,
    description:
      'ANALYSIS_002: Analysis already in progress | ANALYSIS_004: AI service unavailable',
  })
  async trigger(@Body() dto: TriggerAnalysisDto) {
    return await this.analysisService.trigger(dto);
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary:
      'Receive analysis results from the AI service (called by external service)',
  })
  @ApiHeader({
    name: 'x-webhook-signature',
    description:
      'HMAC SHA256 of the raw request body, hex-encoded, signed with WEBHOOK_SECRET',
    required: true,
  })
  @ApiBody({ type: WebhookPayloadDto })
  @ApiOkResponse({ description: 'Result processed (or duplicate ignored)' })
  @ApiResponse({
    status: 202,
    description: 'Unknown externalJobId caller should retry later',
  })
  @ApiUnauthorizedResponse({
    description: 'ANALYSIS_003: Invalid webhook signature',
  })
  async webhook(
    @Headers('x-webhook-signature') signature: string,
    @Req() req: RawBodyRequest<import('express').Request>,
    @Body() payload: WebhookPayloadDto,
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(payload));
    await this.analysisService.handleWebhook(signature, rawBody, payload);
  }

  @Get(':jobId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get the current status and result of an analysis job',
  })
  @ApiOkResponse({ description: 'Analysis job found' })
  @ApiNotFoundResponse({ description: 'ANALYSIS_001: Analysis job not found' })
  async findJob(@Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.analysisService.findJob(jobId);
  }
}
