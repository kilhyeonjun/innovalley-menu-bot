import { injectable } from 'tsyringe';
import { App } from '@slack/bolt';
import { MenuPost } from '@domain/entities';
import {
  ISlackService,
  SendMenuMessageCriteria,
  SendMenuMessageResult,
  SendEphemeralMenuCriteria,
} from '@domain/services';
import { Result } from '@shared/types/Result';
import { SlackDeliveryError } from '@shared/errors/DomainError';
import { SlackMessageBuilder } from './SlackMessageBuilder';

/**
 * Slack Bot Service
 * @slack/bolt 기반 구현
 */
@injectable()
export class SlackBotService implements ISlackService {
  private app: App | null = null;

  private getApp(): App {
    if (!this.app) {
      const token = process.env.SLACK_BOT_TOKEN;
      const signingSecret = process.env.SLACK_SIGNING_SECRET;
      const appToken = process.env.SLACK_APP_TOKEN;

      if (!token || !signingSecret) {
        throw new Error(
          'SLACK_BOT_TOKEN과 SLACK_SIGNING_SECRET 환경변수가 필요합니다'
        );
      }

      this.app = new App({
        token,
        signingSecret,
        // Socket Mode 사용 시
        ...(appToken && {
          socketMode: true,
          appToken,
          socketModeOptions: {
            clientPingTimeout: 15_000,
            serverPingTimeout: 45_000,
            pingPongLoggingEnabled: true,
          },
        }),
      });
    }
    return this.app;
  }

  async sendMenuMessage(
    criteria: SendMenuMessageCriteria
  ): Promise<Result<SendMenuMessageResult, SlackDeliveryError>> {
    const { menuPost, channel } = criteria;

    try {
      const app = this.getApp();
      const blocks = SlackMessageBuilder.buildMenuBlocks(menuPost);

      const message = {
        channel,
        blocks,
        text: `🍽️ ${menuPost.title}`, // 알림용 fallback 텍스트
      };
      let result;
      for (let attempt = 1; ; attempt++) {
        try {
          result = await app.client.chat.postMessage(message);
          break;
        } catch (error) {
          if (!this.isImageDownloadFailure(error) || attempt === 3) {
            throw error;
          }
          console.warn(`[Slack] 외부 이미지 다운로드 실패, 이미지 유지 재시도 (${attempt}/3)`);
          await this.sleep(attempt * 1_000);
        }
      }

      if (!result.ok || !result.ts) {
        return Result.fail(
          new SlackDeliveryError(`Slack API 에러: ${result.error || 'unknown'}`)
        );
      }

      return Result.ok({
        messageTs: result.ts,
        channel: result.channel || channel,
      });
    } catch (error) {
      return Result.fail(
        new SlackDeliveryError(
          `Slack 메시지 발송 실패: ${error instanceof Error ? error.message : String(error)}`,
          error
        )
      );
    }
  }

  async sendEphemeralMenu(
    criteria: SendEphemeralMenuCriteria
  ): Promise<Result<SendMenuMessageResult, SlackDeliveryError>> {
    const { menuPost, channel, userId } = criteria;

    try {
      const app = this.getApp();
      const blocks = SlackMessageBuilder.buildMenuBlocks(menuPost);

      const result = await app.client.chat.postEphemeral({
        channel,
        user: userId,
        blocks,
        text: `🍽️ ${menuPost.title}`,
      });

      if (!result.ok) {
        return Result.fail(
          new SlackDeliveryError(`Slack API 에러: ${result.error || 'unknown'}`)
        );
      }

      return Result.ok({
        messageTs: result.message_ts || '',
        channel,
      });
    } catch (error) {
      return Result.fail(
        new SlackDeliveryError(
          `Slack ephemeral 메시지 발송 실패: ${error instanceof Error ? error.message : String(error)}`,
          error
        )
      );
    }
  }

  /**
   * Slack App 인스턴스 반환 (슬래시 커맨드 등록용)
   */
  getSlackApp(): App {
    return this.getApp();
  }

  private isImageDownloadFailure(error: unknown): boolean {
    const data = (error as {
      data?: { error?: unknown; response_metadata?: { messages?: unknown } };
    })?.data;
    return (
      data?.error === 'invalid_blocks' &&
      Array.isArray(data.response_metadata?.messages) &&
      data.response_metadata.messages.some(
        (message) =>
          typeof message === 'string' &&
          message.includes('downloading image failed') &&
          /\/blocks\/\d+\/image_url/.test(message)
      )
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
