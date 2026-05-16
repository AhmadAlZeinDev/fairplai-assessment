import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsUrl, IsUUID } from 'class-validator';

export class TriggerAnalysisDto {
  @ApiPropertyOptional({
    description:
      'Training session ID. At least one of sessionId or matchId is required.',
  })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Match ID. At least one of sessionId or matchId is required.',
  })
  @IsOptional()
  @IsUUID()
  matchId?: string;

  @ApiProperty({
    example: 'https://storage.example.com/videos/match-123.mp4',
    description:
      'Pre-signed internal storage URL pointing to the uploaded video. ' +
      'In production this URL is generated server-side after the client uploads ' +
      'the video to object storage (e.g. S3) and should never be a public or ' +
      'client-supplied link. Accepted as a plain URL here for simplicity.',
  })
  @IsUrl()
  videoUrl: string;

  @ApiPropertyOptional({
    description: 'Optional metadata forwarded to the AI service',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
