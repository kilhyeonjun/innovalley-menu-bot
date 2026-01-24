import { container } from 'tsyringe';
import { App, KnownBlock } from '@slack/bolt';
import { GetCurrentMenuUseCase } from '@application/use-cases';
import { SlackMessageBuilder } from '@infrastructure/slack';

export function registerMenuCommand(app: App): void {
  // /식단 커맨드 등록
  app.command('/식단', async ({ command, ack, respond }) => {
    // 즉시 응답 (3초 제한)
    await ack();

    const { user_id: userId, channel_id: channel } = command;

    try {
      // 로딩 메시지 표시
      await respond({
        response_type: 'ephemeral',
        blocks: SlackMessageBuilder.buildLoadingBlocks(),
      });

      // UseCase 실행
      const useCase = container.resolve(GetCurrentMenuUseCase);
      const result = await useCase.execute({ userId, channel });

      if (result.isError()) {
        await respond({
          response_type: 'ephemeral',
          replace_original: true,
          blocks: SlackMessageBuilder.buildErrorBlocks(result.error.message),
        });
        return;
      }

      const { post, source } = result.value;

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
