import { container } from 'tsyringe';
import { App } from '@slack/bolt';
import type { KnownBlock } from '@slack/types';
import { GetCurrentMenuUseCase } from '@application/use-cases';
import { SlackMessageBuilder } from '@infrastructure/slack';
import { getMenuSendNotBefore } from '@shared/menuSendPolicy';

export function registerMenuCommand(app: App): void {
  // /식단 커맨드 등록
  app.command('/식단', async ({ command, ack, respond }) => {
    // 즉시 응답 (3초 제한)
    await ack();

    const { user_id: userId, channel_id: channel } = command;
    console.log(`[MenuCommand] /식단 호출 (user: ${userId}, channel: ${channel})`);

    try {
      if (Date.now() < getMenuSendNotBefore().getTime()) {
        await respond({
          response_type: 'ephemeral',
          blocks: SlackMessageBuilder.buildErrorBlocks('발송 시작 전입니다'),
        });
        return;
      }
      // 로딩 메시지 표시
      await respond({
        response_type: 'ephemeral',
        blocks: SlackMessageBuilder.buildLoadingBlocks(),
      });

      // UseCase 실행
      const useCase = container.resolve(GetCurrentMenuUseCase);
      const result = await useCase.execute({ userId, channel });

      if (result.isError()) {
        console.warn(`[MenuCommand] 실패: ${result.error.message}`);
        await respond({
          response_type: 'ephemeral',
          replace_original: true,
          blocks: SlackMessageBuilder.buildErrorBlocks(result.error.message),
        });
        return;
      }

      const { post, source } = result.value;
      console.log(`[MenuCommand] 성공: "${post.title}" (source: ${source})`)

      const sourceBlock: KnownBlock = {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: source === 'cache' ? '💾 캐시에서 조회' : '🔄 새로 크롤링',
          },
        ],
      };

      await respond({
        response_type: 'ephemeral',
        replace_original: true,
        blocks: [...SlackMessageBuilder.buildMenuBlocks(post), sourceBlock],
      });
    } catch (error) {
      console.error('[MenuCommand] 에러:', error);
      await respond({
        response_type: 'ephemeral',
        replace_original: true,
        blocks: SlackMessageBuilder.buildErrorBlocks(
          '식단표를 가져오는 중 오류가 발생했습니다.'
        ),
      });
    }
  });

  console.log('[Slack] /식단 커맨드 등록됨');
}
