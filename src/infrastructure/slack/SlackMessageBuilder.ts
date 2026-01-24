import { MenuPost } from '@domain/entities';
import { KnownBlock } from '@slack/bolt';

export class SlackMessageBuilder {
  static buildMenuBlocks(menuPost: MenuPost): KnownBlock[] {
    const weekRange = menuPost.getWeekRange();
    const rangeText = weekRange
      ? `${weekRange.start} ~ ${weekRange.end}`
      : '';

    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🍽️ 판교 이노밸리 구내식당',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${menuPost.title}*${rangeText ? `\n📅 ${rangeText}` : ''}`,
        },
      },
      {
        type: 'image',
        image_url: menuPost.imageUrl.value,
        alt_text: menuPost.title,
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `📎 <https://pf.kakao.com/_LCxlxlxb/posts|카카오 채널에서 보기>`,
          },
        ],
      },
      {
        type: 'divider',
      },
    ];
  }

  static buildErrorBlocks(message: string): KnownBlock[] {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `❌ *오류 발생*\n${message}`,
        },
      },
    ];
  }

  static buildLoadingBlocks(): KnownBlock[] {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '⏳ 식단표를 가져오는 중입니다...',
        },
      },
    ];
  }
}
