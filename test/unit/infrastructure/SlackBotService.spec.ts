import { afterEach, describe, expect, it, vi } from 'vitest';
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
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('직접 호출도 시작일 전이나 잘못된 시작일이면 다운로드/Slack 발송을 하지 않는다', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-16T08:59:59+09:00'));
    const service = new SlackBotService();
    const download = vi.spyOn(service as never, 'downloadImage');
    for (const boundary of ['2026-11-16T09:00:00+09:00', '', 'invalid', '2026-11-16T09:00:00', '2026-02-30T09:00:00+09:00']) {
      vi.stubEnv('MENU_SEND_NOT_BEFORE', boundary);
      const result = await service.sendMenuMessage({
        menuPost: new MenuPostBuilder().thisWeek().build(),
        channel: 'C123',
      });
      expect(result.isError()).toBe(true);
    }
    expect(download).not.toHaveBeenCalled();
  });

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
      menuPost: new MenuPostBuilder().thisWeek().build(),
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
      menuPost: new MenuPostBuilder().thisWeek().build(),
      channel: 'C123',
    });

    expect(result.isError()).toBe(true);
    expect(filesUploadV2).toHaveBeenCalledOnce();
  });
});
