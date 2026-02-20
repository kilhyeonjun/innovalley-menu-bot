---
name: verify-result-pattern
description: Result<T,E> 패턴 사용과 에러 처리 규칙을 검증합니다. 서비스/UseCase 메서드 변경 후 사용.
---

# Result 패턴 검증

## Purpose

프로젝트의 에러 처리 규칙 준수를 검증합니다:

1. **서비스/UseCase에서 Result 반환** - 실패 가능한 비동기 메서드는 `Promise<Result<T, E>>` 반환
2. **throw 금지** - 서비스/UseCase에서 예상된 실패를 throw하지 않고 `Result.fail()` 사용
3. **DomainError 상속** - 모든 커스텀 에러가 `DomainError`를 상속
4. **Result 체크 후 값 접근** - `result.isError()` 체크 없이 `result.value`에 직접 접근하지 않음

## When to Run

- 서비스 인터페이스의 메서드 시그니처를 변경한 후
- UseCase의 `execute()` 메서드를 수정한 후
- 새로운 에러 타입을 추가한 후
- 에러 처리 로직을 변경한 후

## Related Files

| File | Purpose |
|------|---------|
| `src/shared/types/Result.ts` | Result 모나드 정의 |
| `src/shared/errors/DomainError.ts` | 에러 계층 구조 |
| `src/shared/errors/index.ts` | 에러 export |
| `src/domain/services/ICrawlerService.ts` | Result 반환 서비스 인터페이스 |
| `src/domain/services/ISlackService.ts` | Result 반환 서비스 인터페이스 |
| `src/application/use-cases/CrawlWeeklyMenuUseCase.ts` | Result 반환 UseCase |
| `src/application/use-cases/SendMenuToSlackUseCase.ts` | Result 반환 UseCase |
| `src/application/use-cases/CheckAndSendMenuUseCase.ts` | Result 반환 UseCase |
| `src/application/use-cases/GetCurrentMenuUseCase.ts` | Result 반환 UseCase |

## Workflow

### Step 1: 서비스 인터페이스 Result 반환 타입 확인

**검사:** `src/domain/services/`의 인터페이스 메서드가 `Promise<Result<` 반환 타입을 사용하는지 확인합니다.

Grep 도구로 메서드 시그니처를 검색합니다:

```
패턴: \): Promise<
경로: src/domain/services/
포함: I*.ts
```

찾은 각 메서드의 반환 타입이 `Promise<Result<` 형태인지 확인합니다. `Promise<Result<`가 아닌 반환 타입이 있다면 위반입니다.

**PASS:** 모든 서비스 메서드가 `Promise<Result<T, E>>` 반환
**FAIL:** `Result`를 사용하지 않는 서비스 메서드 발견

**수정:** 반환 타입을 `Promise<Result<SuccessType, ErrorType>>` 형식으로 변경

### Step 2: UseCase execute() Result 반환 확인

**검사:** `src/application/use-cases/`의 UseCase 클래스의 `execute()` 메서드가 `Promise<Result<` 반환 타입을 사용하는지 확인합니다.

Grep 도구로 execute 메서드를 검색합니다:

```
패턴: async execute\(
경로: src/application/use-cases/
포함: *.ts
제외: index.ts
```

각 UseCase 파일을 읽어 execute 메서드의 반환 타입을 확인합니다.

**PASS:** 모든 UseCase의 execute()가 `Promise<Result<T, E>>` 반환
**FAIL:** Result를 사용하지 않는 execute() 발견

**수정:** 반환 타입을 `Promise<Result<XxxResult, DomainError>>` 형식으로 변경하고, 내부 로직에서 `Result.ok()` / `Result.fail()` 사용

### Step 3: 서비스/UseCase에서 예상된 실패 throw 탐지

**검사:** `src/application/use-cases/`와 `src/infrastructure/`에서 `DomainError` 계열 에러를 직접 throw하는 코드를 탐지합니다.

Grep 도구로 throw 패턴을 검색합니다:

```
패턴: throw new (CrawlingError|SlackDeliveryError|NotFoundError|DuplicateError)
경로: src/application/, src/infrastructure/
포함: *.ts
```

**PASS:** 매칭 결과 0건 (모두 Result.fail() 사용)
**FAIL:** DomainError 계열 throw 발견

**수정:** `throw new XxxError(msg)` → `return Result.fail(new XxxError(msg))` 로 변경

### Step 4: DomainError 상속 확인

**검사:** `src/shared/errors/` 내의 모든 커스텀 에러 클래스가 `DomainError`를 상속하는지 확인합니다.

Grep 도구로 에러 클래스를 검색합니다:

```
패턴: export class \w+Error
경로: src/shared/errors/
포함: *.ts
```

각 에러 클래스가 `extends DomainError`를 포함하는지 확인합니다.

**PASS:** 모든 커스텀 에러가 `extends DomainError`
**FAIL:** DomainError를 상속하지 않는 에러 클래스 발견

**수정:** 에러 클래스가 `extends DomainError`를 사용하도록 변경

### Step 5: Result 값 안전 접근 확인

**검사:** `result.value`에 접근하기 전에 `isOk()` 또는 `isError()` 체크가 있는지 확인합니다.

Grep 도구로 `.value` 접근 패턴을 검색합니다:

```
패턴: \.value
경로: src/application/, src/infrastructure/, src/interface/
포함: *.ts
```

각 `.value` 접근 지점의 앞에 `isError()` 또는 `isOk()` 체크가 있는지 코드 컨텍스트를 읽어 확인합니다. 이 검사는 수동 판단이 필요합니다.

**PASS:** 모든 `.value` 접근 전에 Result 상태 체크 존재
**FAIL:** 체크 없이 `.value`에 접근하는 코드 발견

**수정:** `if (result.isError()) { return Result.fail(result.error); }` 후에 `result.value` 접근

## Output Format

```markdown
| # | 검사 | 상태 | 상세 |
|---|------|------|------|
| 1 | 서비스 Result 반환 | PASS/FAIL | 위반 메서드 목록 |
| 2 | UseCase Result 반환 | PASS/FAIL | 위반 UseCase 목록 |
| 3 | DomainError throw 금지 | PASS/FAIL | throw 위치 목록 |
| 4 | DomainError 상속 | PASS/FAIL | 미상속 에러 목록 |
| 5 | Result 값 안전 접근 | PASS/FAIL | 미체크 접근 목록 |
```

## Exceptions

1. **Value Object의 `throw new ValidationError`** - `PostId.create()`, `ImageUrl.create()` 등 값 객체 팩토리 메서드는 fail-fast 원칙에 따라 throw 허용
2. **catch 블록 내 포장 후 Result.fail()** - `try-catch`로 예기치 않은 에러를 잡아 `Result.fail(new DomainError(..., error))` 형태로 반환하는 패턴은 올바름
3. **`src/shared/types/Result.ts` 자체** - Result 클래스 내부의 throw는 잘못된 사용을 방지하는 가드이므로 허용
