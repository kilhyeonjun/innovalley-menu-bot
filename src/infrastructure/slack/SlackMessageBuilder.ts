import { MenuPost } from '@domain/entities';

/**
 * Slack 메시지 빌더
 * Block Kit 형식으로 메시지 구성
 */
export class SlackMessageBuilder {
  /**
   * 식단표 메시지 블록 생성
   */
  static buildMenuBlocks(menuPost: MenuPost): object[] {
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

  /**
   * 에러 메시지 블록 생성
   */
  static buildErrorBlocks(message: string): object[] {
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

  /**
   * 로딩 메시지 블록 생성
   */
  static buildLoadingBlocks(): object[] {
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
