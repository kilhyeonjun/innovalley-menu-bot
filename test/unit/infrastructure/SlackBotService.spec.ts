import { describe, expect, it, vi } from 'vitest';
import { SlackBotService } from '@infrastructure/slack/SlackBotService';
import { MenuPostBuilder } from '../../fixtures/builders';

describe('SlackBotService', () => {
  it('Slack이 외부 이미지를 받지 못하면 이미지 블록을 유지해 재시도한다', async () => {
    const imageError = {
      data: {
        error: 'invalid_blocks',
        response_metadata: {
          messages: [
            '[ERROR] bolt-app downloading image failed [json-pointer:/blocks/2/image_url]',
          ],
        },
      },
    };
    const postMessage = vi
      .fn()
      .mockRejectedValueOnce(imageError)
      .mockRejectedValueOnce(imageError)
      .mockResolvedValueOnce({ ok: true, ts: '123.456', channel: 'C123' });
    const service = new SlackBotService();
    (service as unknown as { app: object }).app = { client: { chat: { postMessage } } };
    vi.spyOn(service as never, 'sleep').mockResolvedValue(undefined as never);

    const result = await service.sendMenuMessage({
      menuPost: new MenuPostBuilder().build(),
      channel: 'C123',
    });

    expect(result.isOk()).toBe(true);
    expect(postMessage).toHaveBeenCalledTimes(3);
    for (const [message] of postMessage.mock.calls) {
      expect(message.blocks).toContainEqual(expect.objectContaining({ type: 'image' }));
    }
  });

  it.each([
    new Error('channel_not_found'),
    {
      data: {
        error: 'channel_not_found',
        response_metadata: {
          messages: ['downloading image failed [json-pointer:/blocks/2/image_url]'],
        },
      },
    },
  ])('이미지와 무관한 Slack 오류는 재발송하지 않는다', async (slackError) => {
    const postMessage = vi.fn().mockRejectedValueOnce(slackError);
    const service = new SlackBotService();
    (service as unknown as { app: object }).app = { client: { chat: { postMessage } } };
    vi.spyOn(service as never, 'sleep').mockResolvedValue(undefined as never);

    const result = await service.sendMenuMessage({
      menuPost: new MenuPostBuilder().build(),
      channel: 'C123',
    });

    expect(result.isError()).toBe(true);
    expect(postMessage).toHaveBeenCalledTimes(1);
  });
});
