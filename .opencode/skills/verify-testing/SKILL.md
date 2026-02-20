---
name: verify-testing
description: 테스트 파일 구조, 네이밍, 빌더 패턴 사용을 검증합니다. 테스트 추가/수정 또는 소스 파일 추가 후 사용.
---

# 테스트 검증

## Purpose

테스트 코드의 구조와 규칙 준수를 검증합니다:

1. **테스트 파일 존재** - 주요 소스 파일에 대응하는 테스트 파일 존재
2. **파일명 규칙** - 테스트 파일이 `.spec.ts` 확장자 사용
3. **빌더 패턴 사용** - 테스트에서 직접 객체 생성 대신 Builder 사용
4. **테스트 디렉토리 구조** - unit/integration/e2e 분류 일관성

## When to Run

- 새 소스 파일(Entity, UseCase, Service)을 추가한 후
- 기존 테스트를 수정한 후
- 빌드/테스트 명령어 실행 전 구조 점검

## Related Files

| File | Purpose |
|------|---------|
| `vitest.config.ts` | 테스트 설정 (include 패턴, alias) |
| `test/setup.ts` | 테스트 전역 설정 |
| `test/unit/domain/MenuPost.spec.ts` | Entity 단위 테스트 |
| `test/unit/domain/DeliveryHistory.spec.ts` | Entity 단위 테스트 |
| `test/unit/domain/value-objects.spec.ts` | VO 단위 테스트 |
| `test/unit/use-cases/CrawlWeeklyMenuUseCase.spec.ts` | UseCase 단위 테스트 |
| `test/unit/use-cases/SendMenuToSlackUseCase.spec.ts` | UseCase 단위 테스트 |
| `test/unit/use-cases/CheckAndSendMenuUseCase.spec.ts` | UseCase 단위 테스트 |
| `test/unit/use-cases/GetCurrentMenuUseCase.spec.ts` | UseCase 단위 테스트 |
| `test/unit/infrastructure/KakaoApiCrawlerService.spec.ts` | Infrastructure 단위 테스트 |
| `test/integration/repositories/MenuPostRepository.spec.ts` | Repository 통합 테스트 |
| `test/integration/repositories/DeliveryHistoryRepository.spec.ts` | Repository 통합 테스트 |
| `test/integration/crawling/PlaywrightCrawlerService.spec.ts` | 크롤러 통합 테스트 |
| `test/integration/slack/SlackBotService.spec.ts` | Slack 통합 테스트 |
| `test/e2e/menu-flow.spec.ts` | E2E 테스트 |
| `test/fixtures/builders/` | 테스트 데이터 빌더 |

## Workflow

### Step 1: 주요 소스 파일의 테스트 존재 확인

**검사:** 다음 카테고리의 소스 파일에 대응하는 테스트 파일이 존재하는지 확인합니다.

대상:
- `src/domain/entities/*.ts` → `test/unit/domain/*.spec.ts`
- `src/application/use-cases/*.ts` → `test/unit/use-cases/*.spec.ts`

Glob 도구로 소스 파일과 테스트 파일을 각각 수집한 뒤 매핑합니다:

```
소스: src/domain/entities/*.ts (index.ts 제외)
테스트: test/unit/domain/*.spec.ts

소스: src/application/use-cases/*.ts (index.ts 제외)
테스트: test/unit/use-cases/*.spec.ts
```

**PASS:** 모든 Entity와 UseCase에 대응 테스트 존재
**FAIL:** 테스트가 없는 소스 파일 발견

**수정:** 기존 테스트 파일을 참조하여 누락된 테스트 파일 생성

### Step 2: 테스트 파일명 규칙 확인

**검사:** `test/` 하위의 모든 테스트 파일이 `.spec.ts` 확장자를 사용하는지 확인합니다.

Glob 도구로 테스트 파일을 검색합니다:

```
패턴: test/**/*.ts
제외: test/setup.ts, test/fixtures/**
```

`.spec.ts`가 아닌 `.test.ts` 또는 기타 확장자를 사용하는 파일이 있는지 확인합니다.

**PASS:** 모든 테스트 파일이 `.spec.ts` 사용
**FAIL:** `.spec.ts` 외 확장자 발견

**수정:** 파일명을 `.spec.ts`로 변경

### Step 3: 테스트에서 빌더 패턴 사용 확인

**검사:** Entity를 사용하는 테스트 파일에서 `new MenuPostBuilder()` 또는 `new DeliveryHistoryBuilder()` 같은 빌더를 사용하는지 확인합니다.

Grep 도구로 직접 `MenuPost.create()` 호출을 테스트에서 검색합니다:

```
패턴: MenuPost\.create\(
경로: test/
포함: *.spec.ts
```

직접 `create()` 호출이 발견되면, 빌더 사용을 권장합니다. (단, 빌더 자체의 테스트는 예외)

**PASS:** 테스트에서 빌더 패턴 사용
**FAIL:** 빌더 없이 직접 Entity 생성하는 테스트 발견

**수정:** `test/fixtures/builders/`의 빌더를 import하여 사용

### Step 4: 테스트 디렉토리 구조 확인

**검사:** 테스트 파일이 올바른 디렉토리에 위치하는지 확인합니다.

규칙:
- 단위 테스트 (mock 사용) → `test/unit/`
- 통합 테스트 (실제 DB/API) → `test/integration/`
- E2E 테스트 (전체 플로우) → `test/e2e/`

Grep 도구로 각 테스트 파일의 import를 분석하여 실제 infrastructure 사용 여부를 확인합니다:

```
패턴: (PrismaClient|new PrismaClient|\.env)
경로: test/unit/
포함: *.spec.ts
```

`test/unit/` 내에서 실제 DB 접근이나 환경변수 사용이 발견되면 integration으로 이동해야 합니다.

**PASS:** 모든 테스트가 적절한 디렉토리에 위치
**FAIL:** 잘못된 디렉토리의 테스트 발견

**수정:** 테스트 파일을 적절한 디렉토리로 이동

### Step 5: 테스트 실행 확인

**검사:** `npm run test:run`으로 모든 테스트가 통과하는지 확인합니다.

Bash 도구로 실행합니다:

```bash
npm run test:run 2>&1
```

**PASS:** 종료 코드 0, 모든 테스트 통과
**FAIL:** 실패한 테스트 존재

**수정:** 실패한 테스트의 에러 메시지를 분석하여 수정

## Output Format

```markdown
| # | 검사 | 상태 | 상세 |
|---|------|------|------|
| 1 | 테스트 파일 존재 | PASS/FAIL | 미커버 소스 파일 목록 |
| 2 | 파일명 규칙 (.spec.ts) | PASS/FAIL | 위반 파일 목록 |
| 3 | 빌더 패턴 사용 | PASS/FAIL | 직접 생성 위치 목록 |
| 4 | 디렉토리 구조 | PASS/FAIL | 잘못된 위치 파일 |
| 5 | 테스트 실행 | PASS/FAIL | 실패 테스트 목록 |
```

## Exceptions

1. **`test/fixtures/` 디렉토리** - 빌더와 헬퍼 파일은 테스트 대상이 아님
2. **`test/setup.ts`** - 전역 설정 파일은 `.spec.ts` 확장자 규칙 면제
3. **빌더 내부의 Entity 직접 생성** - 빌더 구현 자체에서 `MenuPost.create()`를 호출하는 것은 정상
4. **infrastructure 단위 테스트의 mock** - `test/unit/infrastructure/`에서 외부 API를 mock하는 것은 올바른 단위 테스트 패턴
5. **API 토큰이 필요한 테스트** - `describe.skipIf(!process.env.SLACK_BOT_TOKEN)` 패턴으로 조건부 스킵하는 통합 테스트는 CI 환경에서 실패해도 PASS 처리
