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
- 평일 09:00~15:00(KST) 매시 카카오 채널에서 이번 주 식단표 확인
- 허용 시간대에 부팅하면 즉시 한 번 확인한 뒤 정기 확인 계속
- 새 식단표 발견 시 지정된 Slack 채널로 발송하며, 실패하면 다음 정기 확인에서 재확인
- `MENU_SEND_NOT_BEFORE` 이전에는 자동·수동 발송 모두 금지

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
│  │  /health    │  │   /식단     │  │ 평일 09~15시 KST 매시   │  │
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
| 스케줄링 | node-cron | 평일 09~15시 KST 매시 확인 및 부팅 catch-up |
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

# Scheduler (배포 시 실제 값은 비밀 .env에서 주입)
TZ=Asia/Seoul
MENU_SEND_NOT_BEFORE=2026-11-16T09:00:00+09:00
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

### NAS Linux Docker 단독 배포

Hermes 스케줄러나 호스트 Python 실행 없이 `menu-bot` 컨테이너 하나로 운영합니다. Dockerfile은 Node 20 slim 기반 멀티스테이지 빌드이며 NAS의 Linux amd64 Docker에서 그대로 빌드합니다.

- 체크아웃 위치 예: 관리 PC의 `C:\projects\innovalley-menu-bot`. Docker CLI가 **회사 NAS worker의 Linux Docker 엔진**을 가리키는지 먼저 확인합니다. 아래 Compose 명령은 모두 동일 엔진·체크아웃·프로젝트에서 실행합니다.
- 기본 프로젝트는 `innovalley-menu-bot`, 서비스는 `menu-bot`, 전용 볼륨은 `innovalley-menu-bot_menu-data`입니다. 고정 컨테이너 이름은 사용하지 않습니다.
- 기존 NAS 컨테이너·다른 Compose 프로젝트는 변경하지 않습니다. 전역 prune, 다른 프로젝트의 down, `down -v`는 금지합니다.
- 포트는 **NAS 루프백 `127.0.0.1:3001`**에만 바인딩됩니다. 관리 PC의 localhost가 아닙니다.
- 재시작 정책은 `unless-stopped`; 로그는 `json-file`, 파일당 10MB·최대 3개입니다.
- `.env`는 접근을 제한하고 커밋하지 않습니다. `.dockerignore`가 실제 환경파일·DB·개인키를 빌드 컨텍스트에서 제외합니다. 비밀파일을 소스에 다른 이름으로 넣지 않습니다.

#### 최초 이관: 먼저 구 발송 주체 중지, DB 복원, 마지막에 시작

**2026-11-09~13 주간은 다른 사람이 이미 게시했으므로 자동·수동·테스트 전송을 하지 않습니다. 최초 허용 시각은 `2026-11-16T09:00:00+09:00`입니다.** 비밀 `.env`에 이 값을 `MENU_SEND_NOT_BEFORE`로 설정하며, 시험 목적으로 과거 시각으로 바꾸거나 비우지 않습니다. `TZ=Asia/Seoul`은 Compose에서 전달합니다.

1. 맥미니의 기존 봇, Hermes 예약, 호스트 실행기 등 기존 발송 경로를 모두 중지·비활성화합니다. NAS와 동시에 실행하지 않습니다.
2. 기존 SQLite의 일관된 스냅샷을 만듭니다(SQLite `.backup` 사용 권장). 실행 중인 DB 본파일만 복사하면 WAL의 이력이 빠질 수 있으므로 금지합니다. 원본과 스냅샷을 안전하게 보관하고 NAS 발송을 시작하기 전에 복원을 끝냅니다.
3. 스냅샷 전체를 이관합니다. `menu_posts`, `delivery_histories`, 마이그레이션 이력을 보존하며 초기 DB 생성·발송 이력 삭제로 대체하지 않습니다. 기존 주차 판정과 `(postId, channel)` 중복 방지를 유지하기 위해 기존 `SLACK_CHANNEL_ID`도 보존합니다.
4. `.env.example`을 참고해 비밀 `.env`를 준비합니다. 자격증명·DB 내용·렌더링된 Compose 설정을 로그나 이슈에 붙이지 않습니다.
5. 아래 명령은 이미지 빌드와 **미시작 컨테이너 생성**, DB 복원 후 시작 순서입니다. `menu.snapshot.db`는 관리 PC에서 접근 가능한 일관된 백업 경로로 바꿉니다. DB 파일을 전달하기 전에는 `up`을 실행하지 않습니다.

```bash
docker compose -p innovalley-menu-bot build menu-bot
docker compose -p innovalley-menu-bot create menu-bot
docker compose -p innovalley-menu-bot cp ./menu.snapshot.db menu-bot:/app/data/menu.db
docker compose -p innovalley-menu-bot up -d menu-bot
docker compose -p innovalley-menu-bot logs --tail 100 menu-bot
```

컨테이너 시작 시 `prisma migrate deploy`가 실행됩니다. 기존 이력이 보존됐는지 읽기 전용으로 확인하고, 배포 검증을 위해 `/api/menu/send`나 `/식단`을 호출하지 않습니다.

#### 관측과 복구

NAS worker 셸에서 다음 읽기 전용 상태 확인을 사용합니다.

```bash
curl http://127.0.0.1:3001/health
docker compose -p innovalley-menu-bot ps
docker compose -p innovalley-menu-bot logs --tail 100 menu-bot
```

`/health`의 프로세스 상태뿐 아니라 scheduler의 실행 상태, 시작 허용 시각, 최근 체크 시각·결과·오류를 함께 확인합니다. 시작일 이전의 보류와 허용 시간대 밖의 대기는 정상이며, `healthy` 또는 프로세스 생존만으로 실제 스케줄 확인 성공을 판단하지 않습니다. 허용된 평일 09~15시에는 최근 체크가 진행되는지, 실패 후 다음 정기 확인이 이어지는지 관측합니다.

- 일시 오류: 최근 체크 오류와 로그로 원인을 확인한 뒤 `docker compose -p innovalley-menu-bot restart menu-bot`으로 해당 서비스만 재시작합니다. 허용 시간대 재시작은 즉시 catch-up할 수 있으므로 DB·시작일·단일 발송 주체를 먼저 확인합니다.
- 이미지 교체 전: 해당 서비스만 중지하고 현재 DB의 일관된 백업과 현재 이미지 ID/배포 커밋을 보관합니다. 볼륨을 삭제하지 않습니다.
- 롤백: NAS 서비스를 먼저 중지합니다. 호환되는 직전 이미지/커밋으로 돌리고 **최신 발송 이력이 든 DB**를 유지합니다. 발송 뒤 오래된 DB로 되돌리면 중복 전송 위험이 있으므로 이력을 잃는 복원은 하지 않습니다.
- DB 복원이 필요한 경우: 모든 발송 주체를 중지한 상태에서 최신 일관된 백업을 전용 볼륨의 `/app/data/menu.db`로 복원합니다. 기존 WAL/SHM 파일을 새 백업과 섞지 않습니다. 백업 이후 발송 여부가 불명확하면 발송을 재개하지 말고 이력부터 대조합니다.
- 맥미니로 복귀해야 한다면 NAS가 완전히 중지된 뒤 최신 DB와 동일한 시작일 제한을 갖춘 실행기 **하나만** 켭니다. 제한 없는 구 Hermes/Python 실행기는 재활성화하지 않습니다.

---

## API

### GET /health

프로세스와 scheduler 운영 상태를 함께 반환합니다. scheduler의 실행 상태, 시작 허용 시각(`MENU_SEND_NOT_BEFORE`), 최근 체크 시각·결과·오류를 확인하여 단순 서버 생존과 구분합니다. HTTP 성공만 보지 말고 본문의 scheduler 상태를 확인합니다. 이 API 자체는 발송을 수행하지 않습니다.

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

`node-cron`으로 평일 09~15시(KST) 매시 확인합니다.

```text
0 9-15 * * 1-5   Asia/Seoul
```

허용 시간대 부팅 시 즉시 한 번 확인(catch-up)하고 이후 정기 확인을 이어갑니다. 시간대 밖 부팅은 다음 허용 시각을 기다립니다. `MENU_SEND_NOT_BEFORE` 이전에는 부팅 catch-up과 수동 API를 포함한 발송이 차단됩니다.

**실행 흐름:**
1. 시작 허용 시각과 스케줄 시간대 확인
2. 카카오 채널에서 최신 식단표 크롤링 및 기존 주차 판정
3. 기존 DB의 채널별 발송 이력 확인
4. 이번 주 미발송 식단표만 Slack 발송하고 이력 저장
5. 실패 시 오류를 health에 노출하고 다음 정기 확인에서 재확인

`POST /api/menu/send`의 기존 `success`/`data` JSON 계약은 유지합니다. 수동 호출도 시작일 제한과 중복 방지를 우회하지 않습니다. 이번 주 건너뛰기를 검증하기 위해 실제 전송을 시도하지 않습니다.

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
