/**
 * 환경변수 설정
 */
export interface Environment {
  // Server
  port: number;
  nodeEnv: string;

  // Database
  databaseUrl: string;

  // Slack
  slackBotToken: string;
  slackSigningSecret: string;
  slackAppToken?: string;
  slackChannelId: string;

  // Kakao
  kakaoChannelUrl: string;
}

/**
 * 환경변수 로드 및 검증
 */
export function loadEnvironment(): Environment {
  const env: Environment = {
    // Server
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    // Database
    databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',

    // Slack
    slackBotToken: process.env.SLACK_BOT_TOKEN || '',
    slackSigningSecret: process.env.SLACK_SIGNING_SECRET || '',
    slackAppToken: process.env.SLACK_APP_TOKEN,
    slackChannelId: process.env.SLACK_CHANNEL_ID || '',

    // Kakao
    kakaoChannelUrl:
      process.env.KAKAO_CHANNEL_URL || 'https://pf.kakao.com/_LCxlxlxb/posts',
  };

  // 필수 환경변수 검증 (개발 환경에서는 경고만)
  const required = ['slackBotToken', 'slackSigningSecret', 'slackChannelId'] as const;
  const missing = required.filter((key) => !env[key]);

  if (missing.length > 0) {
    const message = `필수 환경변수 누락: ${missing.join(', ')}`;
    if (env.nodeEnv === 'production') {
      throw new Error(message);
    }
    console.warn(`[Environment] ${message}`);
  }

  return env;
}

export const env = loadEnvironment();
