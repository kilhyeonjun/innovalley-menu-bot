# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

카카오 채널(판교 이노밸리 구내식당) 주간 식단표를 크롤링하여 Slack으로 자동 발송하는 봇 (냠냠위듀)

## Commands

```bash
# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 테스트
npm test              # watch 모드
npm run test:run      # 1회 실행
npm run test:coverage # 커버리지 포함

# 단일 테스트 파일 실행
npm test -- test/unit/domain/MenuPost.spec.ts

# Prisma
npm run prisma:generate  # 클라이언트 생성
npm run prisma:migrate   # 마이그레이션 실행
npm run prisma:studio    # DB GUI
```

## Architecture

Clean Architecture + TSyringe DI 패턴

```
src/
├── domain/           # 비즈니스 핵심 (의존성 없음)
│   ├── entities/     # MenuPost, DeliveryHistory
│   ├── repositories/ # Repository 인터페이스
│   ├── services/     # ICrawlerService, ISlackService
│   └── value-objects/# PostId, ImageUrl
│
├── application/      # UseCase 레이어
│   └── use-cases/    # CrawlWeeklyMenu, SendMenuToSlack, CheckAndSendMenu, GetCurrentMenu
│
├── infrastructure/   # 외부 구현체
│   ├── crawling/     # PlaywrightCrawlerService
│   ├── slack/        # SlackBotService, SlackMessageBuilder
│   ├── persistence/  # Prisma Repositories
│   └── scheduling/   # CronScheduler
│
├── interface/        # 진입점
│   ├── http/         # Express 라우터
│   └── slack/        # /식단 슬래시 커맨드
│
├── config/           # DI 컨테이너, 환경변수
└── shared/           # Result<T,E>, DomainError
```

### Key Patterns

- **Result<T, E>**: 성공/실패 명시적 표현 (`@shared/types/Result.ts`)
- **DI Container**: TSyringe로 인터페이스-구현체 바인딩 (`@config/container.ts`)
- **Path Aliases**: `@domain/*`, `@application/*`, `@infrastructure/*`, `@interface/*`, `@shared/*`, `@config/*`

### Database

- SQLite + Prisma ORM
- `MenuPost`: 크롤링된 식단표 게시물
- `DeliveryHistory`: Slack 발송 이력 (중복 발송 방지용)

## Test Structure

```bash
test/
├── unit/           # Mock 사용, 빠름
├── integration/    # 실제 DB 사용
├── e2e/            # 전체 플로우
└── fixtures/builders/  # MenuPostBuilder, DeliveryHistoryBuilder
```

API 키 필요 테스트는 `describe.skipIf(!process.env.SLACK_BOT_TOKEN)` 패턴 사용
