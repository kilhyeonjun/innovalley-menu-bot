# AGENTS.md

Instructions for AI coding agents working on this repository.

## Project Overview

Slack bot (냠냠위듀) that crawls weekly meal menus from a Kakao channel and auto-delivers to Slack.

**Stack**: TypeScript, Node.js, Playwright (crawling), Slack Bolt, Prisma (SQLite), TSyringe (DI)

---

## Commands

```bash
# Development
npm run dev                    # Start dev server (ts-node with path aliases)
npm run build                  # TypeScript compile to dist/

# Testing
npm test                       # Vitest in watch mode
npm run test:run               # Single test run
npm run test:coverage          # With coverage report

# Run single test file
npm test -- test/unit/domain/MenuPost.spec.ts
npm test -- test/integration/repositories/MenuPostRepository.spec.ts

# Run tests matching pattern
npm test -- --testNamePattern="isThisWeek"

# Database
npm run prisma:generate        # Generate Prisma client
npm run prisma:migrate         # Run migrations
npm run prisma:studio          # DB GUI

# Lint
npm run lint                   # ESLint check
```

---

## Architecture

**Clean Architecture + TSyringe DI**

```
src/
├── domain/           # Pure business logic (NO external dependencies)
│   ├── entities/     # MenuPost, DeliveryHistory
│   ├── repositories/ # Interface definitions (IMenuPostRepository)
│   ├── services/     # Service interfaces (ICrawlerService, ISlackService)
│   └── value-objects/# PostId, ImageUrl (immutable, validated)
│
├── application/      # Use cases orchestrating domain
│   └── use-cases/    # CrawlWeeklyMenu, SendMenuToSlack, CheckAndSendMenu
│
├── infrastructure/   # External implementations
│   ├── crawling/     # PlaywrightCrawlerService
│   ├── slack/        # SlackBotService, SlackMessageBuilder
│   ├── persistence/  # Prisma repositories
│   └── scheduling/   # CronScheduler
│
├── interface/        # Entry points
│   ├── http/         # Express routes
│   └── slack/        # Slash command handlers
│
├── config/           # DI container setup, environment config
└── shared/           # Cross-cutting: Result<T,E>, DomainError, utils
```

---

## Code Style

### Path Aliases (REQUIRED)

Always use path aliases - never relative paths across layers:

```typescript
// Correct
import { MenuPost } from '@domain/entities';
import { Result } from '@shared/types/Result';
import { ICrawlerService } from '@domain/services';

// Wrong
import { MenuPost } from '../../../domain/entities';
```

Available aliases: `@domain/*`, `@application/*`, `@infrastructure/*`, `@interface/*`, `@shared/*`, `@config/*`

### Dependency Injection

Use TSyringe decorators. Register in `@config/container.ts`:

```typescript
@injectable()
export class SomeUseCase {
  constructor(
    @inject(ICrawlerService)
    private readonly crawlerService: ICrawlerService,
    @inject(IMenuPostRepository)
    private readonly repository: IMenuPostRepository
  ) {}
}
```

Interface tokens use Symbol pattern:
```typescript
export interface IMenuPostRepository { ... }
export const IMenuPostRepository = Symbol('IMenuPostRepository');
```

### Result Type (Error Handling)

Use `Result<T, E>` for operations that can fail - NO throwing errors for expected failures:

```typescript
// Service returns Result
async crawlLatestMenu(): Promise<Result<CrawlLatestMenuResult, CrawlingError>> {
  // ...
  if (failed) {
    return Result.fail(new CrawlingError('Failed to crawl'));
  }
  return Result.ok({ post, isNew: true });
}

// Caller handles Result
const result = await this.crawlerService.crawlLatestMenu();
if (result.isError()) {
  return Result.fail(result.error);
}
const { post } = result.value;
```

### Domain Errors

Extend `DomainError` with specific error types:

```typescript
export class CrawlingError extends DomainError { ... }
export class SlackDeliveryError extends DomainError { ... }
export class ValidationError extends DomainError { ... }
export class NotFoundError extends DomainError { ... }
```

### Value Objects

Immutable, validated via factory method:

```typescript
export class PostId {
  private constructor(public readonly value: string) {}

  static create(value: string): PostId {
    if (!value || value.trim().length === 0) {
      throw new ValidationError('PostId는 빈 값일 수 없습니다');
    }
    return new PostId(value.trim());
  }
}
```

### Entity Pattern

- Private constructor with static factory methods
- `create()` for new entities, `fromPersistence()` for DB reconstruction
- `toPersistence()` for saving

---

## Testing

### Structure

```
test/
├── unit/               # Fast, mocked dependencies
├── integration/        # Real DB (test.db SQLite)
├── e2e/                # Full flow
└── fixtures/builders/  # Test data builders
```

### Builder Pattern

Use builders for test data:

```typescript
import { MenuPostBuilder } from '../../fixtures/builders';

const post = new MenuPostBuilder()
  .withPostId('test-123')
  .withTitle('주간메뉴[12/22-12/26]')
  .thisWeek()  // Convenience method
  .build();
```

### Test Conventions

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('MenuPost', () => {
  describe('isThisWeek', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('이번 주 게시물이면 true를 반환한다', () => {
      vi.setSystemTime(new Date('2024-12-18T10:00:00'));
      const post = new MenuPostBuilder()
        .withPublishedAt(new Date('2024-12-16T09:00:00'))
        .build();
      expect(post.isThisWeek()).toBe(true);
    });
  });
});
```

### Skip Tests Requiring API Keys

```typescript
describe.skipIf(!process.env.SLACK_BOT_TOKEN)('SlackBotService', () => {
  // Tests requiring real Slack token
});
```

### Integration Test DB Setup

```typescript
beforeAll(async () => {
  prisma = new PrismaClient({ datasources: { db: { url: 'file:./test.db' } } });
  await prisma.$connect();
});

beforeEach(async () => {
  await prisma.$executeRaw`PRAGMA foreign_keys = OFF`;
  await prisma.$executeRaw`DELETE FROM delivery_histories`;
  await prisma.$executeRaw`DELETE FROM menu_posts`;
  await prisma.$executeRaw`PRAGMA foreign_keys = ON`;
});
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/config/container.ts` | DI bindings |
| `src/shared/types/Result.ts` | Result monad |
| `src/shared/errors/DomainError.ts` | Error hierarchy |
| `prisma/schema.prisma` | Database schema |
| `vitest.config.ts` | Test configuration |

---

## Important Notes

1. **Domain layer has NO external dependencies** - only types and pure logic
2. **Always use Result<T,E>** for fallible operations in services/use-cases
3. **Value objects throw ValidationError** on invalid input (fail-fast)
4. **Korean comments** are acceptable - this is a Korean project
5. **Test files use `.spec.ts`** extension
6. **reflect-metadata** must be imported before DI container usage
