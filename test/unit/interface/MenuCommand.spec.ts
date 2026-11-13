import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { container } from 'tsyringe';
import { App } from '@slack/bolt';
import { registerMenuCommand } from '@interface/slack/commands/MenuCommand';
import { Result } from '@shared/types/Result';
import { MenuPostBuilder } from '../../fixtures/builders';

describe('/식단 발송 시작 경계', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv('MENU_SEND_NOT_BEFORE', '2026-11-16T09:00:00+09:00');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it.each([
    ['2026-11-13T11:00:00+09:00', 0],
    ['2026-11-16T08:59:59.999+09:00', 0],
    ['2026-11-16T09:00:00+09:00', 1],
  ])('조회가 성공해도 시작 전에는 메뉴 본문을 응답하지 않는다: %s', async (now, imageCount) => {
    vi.setSystemTime(new Date(now));
    const post = new MenuPostBuilder().thisWeek().build();
    vi.spyOn(container, 'resolve').mockReturnValue({
      execute: vi.fn().mockResolvedValue(Result.ok({ post, source: 'cache' })),
    });
    type Response = {blocks: Array<{type: string}>};
    type CommandArgs = {
      command: {user_id: string; channel_id: string};
      ack: () => Promise<void>;
      respond: (message: Response) => Promise<void>;
    };
    let handler: (args: CommandArgs) => Promise<void> = async () => { throw new Error('handler not registered'); };
    // The command only consumes registration; no Slack client or transport is constructed.
    const app = {
      command: (_name: string, callback: typeof handler) => { handler = callback; },
    } as unknown as App;
    registerMenuCommand(app);
    const responses: Array<{blocks: Array<{type: string}>}> = [];
    await handler({
      command: {user_id: 'U_TEST', channel_id: 'C_TEST'},
      ack: async () => {},
      respond: async (message: {blocks: Array<{type: string}>}) => { responses.push(message); },
    });
    const images = responses.flatMap(response => response.blocks.filter(block => block.type === 'image'));
    expect(images).toHaveLength(imageCount);
  });
});
