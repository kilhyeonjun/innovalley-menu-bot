# 냠냠위듀 🍽️

판교 이노밸리 구내식당 주간 식단표를 카카오 채널에서 크롤링하여 Slack으로 자동 발송하는 봇

## 목차

- [기능](#기능)
- [아키텍처](#아키텍처)
- [기술 스택](#기술-스택)
- [설치](#설치)
- [환경변수](#환경변수)
- [Slack App 설정](#slack-app-설정)
- [실행](#실행)
- [API](#api)
- [데이터 흐름](#데이터-흐름)
- [프로젝트 구조](#프로젝트-구조)
- [개발](#개발)

---

## 기능

### 자동 발송
- 매주 월요일 오전 9시(KST)에 카카오 채널에서 새 식단표 크롤링
- 새 식단표 발견 시 지정된 Slack 채널로 자동 발송
- 발송 실패 시 최대 6회까지 1시간 간격으로 재시도

### 슬래시 커맨드
- `/식단` 입력 시 이번 주 식단표 즉시 조회
- 캐시된 데이터 우선 반환, 없으면 실시간 크롤링

### 중복 방지
- `DeliveryHistory` 테이블로 채널별 발송 이력 관리
- 동일 식단표를 같은 채널에 중복 발송하지 않음

---

## 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                         Interface Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ HTTP Routes │  │ Slack Cmds  │  │     Cron Scheduler      │  │
│  │  /health    │  │   /식단     │  │  매주 월 09:00 KST      │  │
│  │  /api/menu  │  │             │  │                         │  │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘  │
└─────────┼────────────────┼──────────────────────┼───────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Application Layer                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ GetCurrentMenu  │  │ CrawlWeeklyMenu │  │ CheckAndSendMenu│  │
│  │    UseCase      │  │    UseCase      │  │    UseCase      │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
└───────────┼────────────────────┼────────────────────┼───────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Infrastructure Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Playwright │  │  Slack Bot  │  │    Prisma Repository    │  │
│  │  Crawler    │  │  Service    │  │  (SQLite)               │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
     [카카오 채널]         [Slack API]          [SQLite DB]
```

---

## 기술 스택

| 분류 | 기술 | 용도 |
|------|------|------|
| Runtime | Node.js 20 | 서버 런타임 |
| Language | TypeScript 5 | 타입 안정성 |
| 크롤링 | Playwright | 카카오 채널 크롤링 (headless Chrome) |
| Slack | @slack/bolt | Socket Mode 기반 봇 |
| ORM | Prisma | SQLite 데이터베이스 |
| DI | TSyringe | 의존성 주입 컨테이너 |
| 스케줄링 | node-cron | 주간 자동 발송 |
| 컨테이너 | Docker | 배포 환경 |

---

## 설치

### 사전 요구사항

- Node.js 20 이상
- Docker & Docker Compose (배포 시)
- Slack App (Bot Token, Signing Secret, App Token)

### 로컬 개발 환경

```bash
# 1. 저장소 클론
git clone https://github.com/kilhyeonjun/innovalley-menu-bot.git
cd innovalley-menu-bot

# 2. 의존성 설치
npm install

# 3. Playwright 브라우저 설치 (크롤링용)
npx playwright install chromium

# 4. 환경변수 설정
cp .env.example .env
# .env 파일을 열어 Slack 토큰 등 입력

# 5. Prisma 클라이언트 생성
npm run prisma:generate

# 6. 데이터베이스 마이그레이션
npm run prisma:migrate

# 7. 개발 서버 실행
npm run dev
```

---

## 환경변수

`.env` 파일에 다음 값들을 설정합니다:

```bash
# ─────────────────────────────────────────
# Database
# ─────────────────────────────────────────
DATABASE_URL="file:./data/menu.db"

# ─────────────────────────────────────────
# Slack Bot (필수)
# ─────────────────────────────────────────
# Bot User OAuth Token (xoxb-로 시작)
# Slack App > OAuth & Permissions > Bot User OAuth Token
SLACK_BOT_TOKEN=xoxb-your-bot-token

# Signing Secret
# Slack App > Basic Information > Signing Secret
SLACK_SIGNING_SECRET=your-signing-secret

# App-Level Token (xapp-로 시작, Socket Mode용)
# Slack App > Basic Information > App-Level Tokens
SLACK_APP_TOKEN=xapp-your-app-token

# 식단표를 발송할 Slack 채널 ID (C로 시작)
# 채널 우클릭 > 채널 세부정보 보기 > 하단의 채널 ID
SLACK_CHANNEL_ID=C0123456789

# ─────────────────────────────────────────
# Kakao Channel (선택)
# ─────────────────────────────────────────
# 크롤링 대상 카카오 채널 URL (기본값 사용 가능)
KAKAO_CHANNEL_URL=https://pf.kakao.com/_LCxlxlxb/posts

# ─────────────────────────────────────────
# Server
# ─────────────────────────────────────────
PORT=3000
NODE_ENV=development  # production | development
```

---

## Slack App 설정

### 1. 앱 생성

1. [Slack API](https://api.slack.com/apps) 접속
2. **Create New App** > **From scratch**
3. App Name: `냠냠위듀` (또는 원하는 이름)
4. Workspace 선택 후 생성

### 2. Bot Token Scopes 설정

**OAuth & Permissions** 메뉴에서 Bot Token Scopes 추가:

| Scope | 용도 |
|-------|------|
| `chat:write` | 메시지 발송 |
| `commands` | 슬래시 커맨드 |
| `files:write` | 메뉴 이미지를 Slack 파일로 업로드 |

### 3. Socket Mode 활성화

1. **Socket Mode** 메뉴 > Enable Socket Mode **ON**
2. App-Level Token 생성 (이름: `socket-mode`)
3. Scope: `connections:write` 선택
4. 생성된 `xapp-` 토큰을 `SLACK_APP_TOKEN`에 설정

### 4. 슬래시 커맨드 등록

**Slash Commands** 메뉴에서:

| 항목 | 값 |
|------|-----|
| Command | `/식단` |
| Short Description | `이번 주 식단표 조회` |
| Usage Hint | (비워둠) |

### 5. 앱 설치

1. **Install App** 메뉴 > **Install to Workspace**
2. 권한 승인
3. 생성된 `xoxb-` 토큰을 `SLACK_BOT_TOKEN`에 설정

### 6. 채널에 봇 추가

식단표를 받을 채널에서:
```
/invite @냠냠위듀
```

---

## 실행

### 로컬 개발

```bash
npm run dev
```

### Docker 배포

```bash
# 빌드 및 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f menu-bot

# 중지
docker-compose down
```

### 실행 확인

```bash
# 헬스체크
curl http://localhost:3001/health

# 응답 예시
{"status":"ok","timestamp":"2026-01-24T12:00:00.000Z","uptime":100}
```

---

## API

### GET /health

서버 상태 확인

**Response**
```json
{
  "status": "ok",
  "timestamp": "2026-01-24T12:00:00.000Z",
  "uptime": 3600.123
}
```

### GET /api/menu/latest

최신 식단표 조회 (없으면 크롤링 후 반환)

**Success Response**
```json
{
  "success": true,
  "data": {
    "post": {
      "postId": "123456789",
      "title": "이노밸리 구내식당 주간메뉴[01/20-01/24]",
      "imageUrl": "https://k.kakaocdn.net/dn/.../menu.jpg",
      "publishedAt": "2026-01-20T00:00:00.000Z"
    },
    "source": "cache"  // "cache" | "crawled"
  }
}
```

**Error Response**
```json
{
  "success": false,
  "error": "크롤링 실패: 필수 데이터 누락"
}
```

---

## 데이터 흐름

### 이미지 관리

**이미지를 직접 저장하지 않습니다.** 카카오 채널의 CDN URL만 데이터베이스에 저장합니다.

```
[카카오 채널]                    [서버 DB]                    [Slack]
     │                              │                           │
     │  크롤링                      │                           │
     ├─────────────────────────────▶│                           │
     │  이미지 URL 추출              │                           │
     │  (https://k.kakaocdn.net/...)│                           │
     │                              │                           │
     │                              │  URL 전달                  │
     │                              ├──────────────────────────▶│
     │                              │                           │
     │◀─────────────────────────────┼───────────────────────────│
     │     Slack이 URL로 이미지 로드  │                           │
```

- **장점**: 저장 공간 불필요, 항상 원본 품질 유지
- **주의**: 카카오가 원본 이미지를 삭제하면 표시 불가

### 스케줄링

`node-cron`을 사용하여 매주 월요일 오전 9시(KST)에 자동 실행:

```
┌───────────── 분 (0)
│ ┌─────────── 시 (9)
│ │ ┌───────── 일 (*)
│ │ │ ┌─────── 월 (*)
│ │ │ │ ┌───── 요일 (1 = 월요일)
│ │ │ │ │
0 9 * * 1   Asia/Seoul
```

**실행 흐름:**
1. 카카오 채널에서 최신 식단표 크롤링
2. DB에서 기존 발송 이력 확인
3. 새 식단표이고 미발송 상태면 Slack 발송
4. 발송 이력 저장 (중복 방지)
5. 실패 시 1시간 후 재시도 (최대 6회)

### 데이터베이스 스키마

```
┌─────────────────────┐       ┌─────────────────────┐
│      MenuPost       │       │   DeliveryHistory   │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │       │ id (PK)             │
│ postId (UNIQUE)     │◀──────│ postId (FK)         │
│ title               │       │ channel             │
│ imageUrl            │       │ sentAt              │
│ publishedAt         │       └─────────────────────┘
│ crawledAt           │       
└─────────────────────┘       UNIQUE(postId, channel)
```

---

## 프로젝트 구조

```
src/
├── domain/                    # 순수 비즈니스 로직 (외부 의존성 없음)
│   ├── entities/              # MenuPost, DeliveryHistory
│   ├── repositories/          # Repository 인터페이스
│   ├── services/              # Service 인터페이스
│   └── value-objects/         # PostId, ImageUrl (불변, 검증됨)
│
├── application/               # UseCase 레이어
│   └── use-cases/
│       ├── CrawlWeeklyMenuUseCase.ts
│       ├── SendMenuToSlackUseCase.ts
│       ├── CheckAndSendMenuUseCase.ts
│       └── GetCurrentMenuUseCase.ts
│
├── infrastructure/            # 외부 시스템 구현체
│   ├── crawling/              # PlaywrightCrawlerService
│   ├── slack/                 # SlackBotService, SlackMessageBuilder
│   ├── persistence/           # Prisma Repository 구현체
│   └── scheduling/            # CronScheduler
│
├── interface/                 # 진입점
│   ├── http/                  # Express 라우터
│   └── slack/                 # 슬래시 커맨드 핸들러
│
├── config/                    # 설정
│   └── container.ts           # TSyringe DI 컨테이너
│
├── shared/                    # 공통 모듈
│   ├── types/                 # Result<T, E>
│   └── errors/                # DomainError, CrawlingError 등
│
├── app.ts                     # Express 앱 설정
└── server.ts                  # 서버 엔트리포인트
```

---

## 개발

### 스크립트

```bash
# 개발 서버 (hot reload)
npm run dev

# TypeScript 빌드
npm run build

# 테스트 (watch 모드)
npm test

# 테스트 (1회 실행)
npm run test:run

# 테스트 커버리지
npm run test:coverage

# 단일 테스트 파일 실행
npm test -- test/unit/domain/MenuPost.spec.ts

# ESLint
npm run lint

# Prisma Studio (DB GUI)
npm run prisma:studio
```

### 테스트 구조

```
test/
├── unit/                  # 단위 테스트 (Mock 사용)
│   ├── domain/            # 엔티티, 값 객체
│   └── use-cases/         # UseCase
├── integration/           # 통합 테스트 (실제 DB)
│   └── repositories/      # Repository
├── e2e/                   # E2E 테스트
└── fixtures/
    └── builders/          # 테스트 데이터 빌더
```

### 코드 스타일

- **Path Aliases**: `@domain/*`, `@application/*` 등 사용 필수
- **Error Handling**: `Result<T, E>` 패턴 사용 (예외 던지지 않음)
- **DI**: TSyringe 데코레이터로 의존성 주입
- **테스트**: Vitest + Builder 패턴

자세한 내용은 [AGENTS.md](./AGENTS.md) 참고

---

## License

ISC
