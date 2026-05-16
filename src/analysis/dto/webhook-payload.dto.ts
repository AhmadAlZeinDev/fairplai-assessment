import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export enum WebhookStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

export class WebhookPayloadDto {
  @ApiProperty({
    description: 'The job ID assigned by the external AI service',
  })
  @IsString()
  externalJobId: string;

  @ApiProperty({ enum: WebhookStatus })
  @IsEnum(WebhookStatus)
  status: WebhookStatus;

  @ApiPropertyOptional({ description: 'Analysis result present on success' })
  @IsOptional()
  @IsObject()
  result?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Error detail present on failure' })
  @IsOptional()
  @IsString()
  errorMessage?: string;
}
