import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);
  private readonly enabled: boolean;
  private readonly webhookUrl: string | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.enabled = this.configService.get<string>('SLACK_ENABLED') === 'true';

    if (this.enabled) {
      this.webhookUrl =
        this.configService.getOrThrow<string>('SLACK_WEBHOOK_URL');
    }
  }

  async sendAlert(message: string): Promise<void> {
    if (!this.enabled || !this.webhookUrl) return;

    try {
      await firstValueFrom(
        this.httpService.post(this.webhookUrl, { text: message }),
      );
    } catch (err) {
      this.logger.error('Failed to send Slack alert', err);
    }
  }
}
