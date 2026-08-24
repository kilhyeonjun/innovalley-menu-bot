import { describe, expect, it, vi } from 'vitest';
import { SlackBotService } from '@infrastructure/slack/SlackBotService';
import { MenuPostBuilder } from '../../fixtures/builders';

function mockUploadResponse() {
  return {
    ok: true,
    files: [
      {
        files: [
          { id: 'F123', shares: { public: { C123: [{ ts: '123.456' }] } } },
        ],
      },
    ],
  };
}

describe('SlackBotService', () => {
  it('메뉴 이미지를 대상 채널에 Slack 파일로 발송한다', async () => {
    const postMessage = vi.fn();
    const filesUploadV2 = vi.fn().mockResolvedValue(mockUploadResponse());
    const service = new SlackBotService();
    (service as unknown as { app: object }).app = {
      client: {
        chat: { postMessage },
        files: { uploadV2: filesUploadV2 },
      },
    };
    vi.spyOn(service as never, 'downloadImage').mockResolvedValue(
      Buffer.from('jpeg') as never
    );

    const result = await service.sendMenuMessage({
      menuPost: new MenuPostBuilder().build(),
      channel: 'C123',
    });

    expect(result.isOk()).toBe(true);
    const uploadCriteria = filesUploadV2.mock.calls[0][0];
    expect(Buffer.isBuffer(uploadCriteria.file)).toBe(true);
    expect(uploadCriteria.filename).toMatch(/\.jpg$/);
    expect(uploadCriteria.channel_id).toBe('C123');
    expect(uploadCriteria.initial_comment).toContain('🍽️');
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('Slack 파일 발송 오류를 반환한다', async () => {
    const uploadError = new Error('channel_not_found');
    const filesUploadV2 = vi.fn().mockRejectedValueOnce(uploadError);
    const service = new SlackBotService();
    (service as unknown as { app: object }).app = {
      client: {
        files: { uploadV2: filesUploadV2 },
      },
    };
    vi.spyOn(service as never, 'downloadImage').mockResolvedValue(
      Buffer.from('jpeg') as never
    );

    const result = await service.sendMenuMessage({
      menuPost: new MenuPostBuilder().build(),
      channel: 'C123',
    });

    expect(result.isError()).toBe(true);
    expect(filesUploadV2).toHaveBeenCalledOnce();
  });
});
