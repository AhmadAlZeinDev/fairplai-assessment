import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KinesisClient, PutRecordCommand } from '@aws-sdk/client-kinesis';

@Injectable()
export class KinesisService {
  private readonly logger = new Logger(KinesisService.name);
  private readonly enabled: boolean;
  private readonly client: KinesisClient | null = null;
  private readonly streamName: string | null = null;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<string>('KINESIS_ENABLED') === 'true';

    if (this.enabled) {
      this.streamName = this.configService.getOrThrow<string>(
        'KINESIS_STREAM_NAME',
      );
      this.client = new KinesisClient({
        region: this.configService.getOrThrow<string>('AWS_REGION'),
      });
    }
  }

  async putRecord(data: Record<string, unknown>): Promise<void> {
    if (!this.enabled || !this.client || !this.streamName) return;

    try {
      await this.client.send(
        new PutRecordCommand({
          StreamName: this.streamName,
          Data: Buffer.from(JSON.stringify(data)),
          PartitionKey: Date.now().toString(),
        }),
      );
    } catch (err) {
      this.logger.error('Failed to send record to Kinesis', err);
    }
  }
}
