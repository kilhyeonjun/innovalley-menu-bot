# 냠냠위듀 🍽️

판교 이노밸리 구내식당 주간 식단표를 카카오 채널에서 크롤링하여 Slack으로 자동 발송하는 봇

## 기능

- **자동 발송**: 매주 월요일 오전 9시에 새 식단표 Slack 발송
- **슬래시 커맨드**: `/식단` 입력 시 현재 주간 식단표 조회
- **중복 방지**: 이미 발송한 식단표는 다시 발송하지 않음

## 기술 스택

| 분류 | 기술 |
|------|------|
| Runtime | Node.js 20, TypeScript |
| 크롤링 | Playwright |
| Slack | @slack/bolt (Socket Mode) |
| DB | SQLite + Prisma ORM |
| DI | TSyringe |
| 아키텍처 | Clean Architecture |

## 설치

### 사전 요구사항

- Node.js 20+
- Docker (배포 시)
- Slack App 설정 완료

### 로컬 개발

```bash
# 의존성 설치
npm install

# Playwright 브라우저 설치
npx playwright install chromium

# 환경변수 설정
cp .env.example .env
# .env 파일 편집

# Prisma 설정
npm run prisma:generate
npm run prisma:migrate

# 개발 서버 실행
npm run dev
```

### Docker 배포

```bash
# 환경변수 설정 후
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

## 환경변수

```bash
# Database
DATABASE_URL="file:./data/menu.db"

# Slack Bot (필수)
SLACK_BOT_TOKEN=xoxb-...      # Bot User OAuth Token
SLACK_SIGNING_SECRET=...       # App Signing Secret
SLACK_APP_TOKEN=xapp-...       # Socket Mode App Token
SLACK_CHANNEL_ID=C...          # 발송할 채널 ID

# Server
PORT=3000
NODE_ENV=production
```

## Slack App 설정

1. [Slack API](https://api.slack.com/apps)에서 새 앱 생성
2. **OAuth & Permissions** → Bot Token Scopes:
   - `chat:write`
   - `commands`
3. **Socket Mode** 활성화 → App Token 생성
4. **Slash Commands** → `/식단` 등록
5. 워크스페이스에 앱 설치

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 헬스체크 |
| GET | `/api/menu/latest` | 최신 식단표 조회 |

## 프로젝트 구조

```
src/
├── domain/           # 비즈니스 로직 (의존성 없음)
├── application/      # UseCase 레이어
├── infrastructure/   # 외부 구현체 (Playwright, Slack, Prisma)
├── interface/        # 진입점 (HTTP, Slack 커맨드)
├── config/           # DI 컨테이너
└── shared/           # 공통 (Result, Error)
```

## 스크립트

```bash
npm run dev           # 개발 서버
npm run build         # 빌드
npm test              # 테스트 (watch)
npm run test:run      # 테스트 (1회)
npm run prisma:studio # DB GUI
```

## License

ISC
