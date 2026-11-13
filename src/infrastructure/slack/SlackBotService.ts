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
import { getMenuSendNotBefore } from '@shared/menuSendPolicy';

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
      if (Date.now() < getMenuSendNotBefore().getTime()) {
        return Result.fail(new SlackDeliveryError('발송 시작 전입니다'));
      }
      if (!menuPost.getWeekRange() || !menuPost.isThisWeek()) {
        return Result.fail(new SlackDeliveryError('이번 주 제목의 식단표가 아닙니다'));
      }
      const app = this.getApp();
      const image = await this.downloadImage(menuPost.imageUrl.value);
      const upload = (await app.client.files.uploadV2({
        file: image,
        filename: `innovalley-menu-${menuPost.postId.value}.jpg`,
        title: menuPost.title,
        channel_id: channel,
        initial_comment: `🍽️ ${menuPost.title}`,
      })) as {
        files?: Array<{
          files?: Array<{
            id?: string;
            shares?: { public?: Record<string, Array<{ ts?: string }>> };
          }>;
        }>;
      };
      const uploadedFile = upload.files?.[0]?.files?.[0];
      const messageTs = uploadedFile?.shares?.public?.[channel]?.[0]?.ts ?? uploadedFile?.id;
      if (!messageTs) {
        return Result.fail(
          new SlackDeliveryError('Slack 이미지 파일 발송 결과에 message timestamp가 없습니다')
        );
      }

      return Result.ok({ messageTs, channel });
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
      if (Date.now() < getMenuSendNotBefore().getTime()) {
        return Result.fail(new SlackDeliveryError('발송 시작 전입니다'));
      }
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

  private async downloadImage(url: string): Promise<Buffer> {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) {
      throw new Error(`메뉴 이미지 다운로드 실패: HTTP ${response.status}`);
    }
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      throw new Error(`메뉴 이미지 형식 오류: ${contentType || 'unknown'}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }
}
