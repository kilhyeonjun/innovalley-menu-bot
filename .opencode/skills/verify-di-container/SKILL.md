---
name: verify-di-container
description: TSyringe DI 컨테이너 등록과 인터페이스 토큰 일관성을 검증합니다. 새 서비스/레포지토리 추가 후 사용.
---

# DI 컨테이너 검증

## Purpose

TSyringe 기반 의존성 주입의 일관성을 검증합니다:

1. **인터페이스 Symbol 토큰** - 모든 서비스/레포지토리 인터페이스가 `export const IXxx = Symbol('IXxx')` 패턴 사용
2. **컨테이너 등록 완전성** - 모든 인터페이스가 `container.ts`에 구현체와 바인딩됨
3. **@injectable() 데코레이터** - 모든 infrastructure 구현체와 UseCase에 `@injectable()` 적용
4. **@inject() 토큰 일치** - constructor 파라미터의 `@inject()` 토큰이 올바른 인터페이스 Symbol 참조

## When to Run

- 새 서비스 인터페이스나 레포지토리 인터페이스를 추가한 후
- 새 infrastructure 구현체를 추가한 후
- 새 UseCase를 추가한 후
- `container.ts`를 수정한 후

## Related Files

| File | Purpose |
|------|---------|
| `src/config/container.ts` | DI 바인딩 설정 |
| `src/domain/repositories/IMenuPostRepository.ts` | Repository 인터페이스 + Symbol |
| `src/domain/repositories/IDeliveryHistoryRepository.ts` | Repository 인터페이스 + Symbol |
| `src/domain/services/ICrawlerService.ts` | Service 인터페이스 + Symbol |
| `src/domain/services/ISlackService.ts` | Service 인터페이스 + Symbol |
| `src/infrastructure/persistence/prisma/MenuPostRepository.ts` | Repository 구현체 |
| `src/infrastructure/persistence/prisma/DeliveryHistoryRepository.ts` | Repository 구현체 |
| `src/infrastructure/crawling/KakaoApiCrawlerService.ts` | Crawler 구현체 |
| `src/infrastructure/crawling/PlaywrightCrawlerService.ts` | Crawler 구현체 (대체) |
| `src/infrastructure/slack/SlackBotService.ts` | Slack 구현체 |
| `src/application/use-cases/CrawlWeeklyMenuUseCase.ts` | UseCase |
| `src/application/use-cases/SendMenuToSlackUseCase.ts` | UseCase |
| `src/application/use-cases/CheckAndSendMenuUseCase.ts` | UseCase |
| `src/application/use-cases/GetCurrentMenuUseCase.ts` | UseCase |

## Workflow

### Step 1: 인터페이스 Symbol 토큰 패턴 확인

**검사:** `src/domain/repositories/`와 `src/domain/services/`의 모든 인터페이스 파일이 `export const IXxx = Symbol('IXxx')` 패턴을 포함하는지 확인합니다.

Grep 도구로 `I*.ts` 파일을 검색하고, 각 파일에서 `export const` + `Symbol(` 패턴 존재를 확인합니다:

```
패턴: export const I\w+ = Symbol\(
경로: src/domain/repositories/, src/domain/services/
포함: I*.ts
```

그리고 해당 디렉토리의 모든 `I*.ts` 파일 목록을 구하여, Symbol 정의가 없는 파일을 식별합니다.

**PASS:** 모든 인터페이스 파일에 Symbol 토큰 존재
**FAIL:** Symbol 토큰이 없는 인터페이스 파일 발견

**수정:** 파일 하단에 `export const IXxxService = Symbol('IXxxService');` 추가

### Step 2: 컨테이너 등록 완전성 확인

**검사:** `src/domain/repositories/`와 `src/domain/services/`에서 정의된 모든 Symbol이 `src/config/container.ts`에서 등록되어 있는지 확인합니다.

1. Step 1에서 수집한 Symbol 이름 목록을 container.ts에서 검색
2. container.ts에서 `container.register` 또는 `container.registerSingleton`으로 등록된 토큰 목록 추출
3. 두 목록을 비교하여 누락된 등록 식별

```
패턴: container\.register(Singleton)?\(
경로: src/config/container.ts
```

**PASS:** 모든 인터페이스 Symbol이 container.ts에 등록됨
**FAIL:** 등록되지 않은 Symbol 발견

**수정:** container.ts의 적절한 섹션에 `container.registerSingleton<IXxx>(IXxx, XxxImpl)` 추가

### Step 3: @injectable() 데코레이터 확인

**검사:** `src/infrastructure/`와 `src/application/use-cases/`의 클래스 파일에 `@injectable()` 데코레이터가 적용되어 있는지 확인합니다.

Grep 도구로 class 선언을 찾되, `@injectable()` 없는 class를 식별합니다:

```
패턴: export class \w+
경로: src/infrastructure/, src/application/use-cases/
포함: *.ts
제외: index.ts
```

찾은 각 파일에서 `@injectable()` 존재 여부를 확인합니다.

**PASS:** 모든 구현체/UseCase 클래스에 `@injectable()` 존재
**FAIL:** 데코레이터 없는 클래스 발견

**수정:** 클래스 선언 바로 위에 `@injectable()` 추가하고, `import { injectable } from 'tsyringe'` 확인

### Step 4: @inject() 토큰 참조 확인

**검사:** UseCase의 constructor에서 `@inject(IXxx)` 형태로 인터페이스를 주입받을 때, 해당 `IXxx`가 올바른 Symbol import인지 확인합니다.

```
패턴: @inject\(\w+\)
경로: src/application/use-cases/
포함: *.ts
```

각 `@inject()` 토큰이 `@domain/repositories` 또는 `@domain/services`에서 import되었는지 확인합니다.

**PASS:** 모든 @inject 토큰이 올바른 경로에서 import됨
**FAIL:** 잘못된 경로에서 import하거나, import 없이 사용

**수정:** `import { IXxx } from '@domain/repositories'` 또는 `'@domain/services'`에서 올바르게 import

## Output Format

```markdown
| # | 검사 | 상태 | 상세 |
|---|------|------|------|
| 1 | Symbol 토큰 패턴 | PASS/FAIL | 위반 파일 목록 |
| 2 | 컨테이너 등록 완전성 | PASS/FAIL | 미등록 Symbol 목록 |
| 3 | @injectable() 데코레이터 | PASS/FAIL | 누락 파일 목록 |
| 4 | @inject() 토큰 참조 | PASS/FAIL | 잘못된 토큰 목록 |
```

## Exceptions

1. **`src/infrastructure/persistence/prisma/PrismaClient.ts`** - PrismaClient 팩토리 함수는 클래스가 아니므로 `@injectable()` 불필요
2. **`src/infrastructure/scheduling/CronScheduler.ts`** - 스케줄러가 직접 `container.resolve()`로 UseCase를 해결하는 경우 허용 (부트스트랩 코드와 유사)
3. **index.ts 파일** - barrel export 파일은 re-export만 하므로 DI 검사 대상 아님
