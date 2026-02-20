---
name: verify-architecture
description: Clean Architecture 레이어 의존성 방향과 경로 별칭 규칙을 검증합니다. 새 파일 추가, import 변경 후 사용.
---

# Clean Architecture 검증

## Purpose

프로젝트의 Clean Architecture 규칙 준수를 검증합니다:

1. **레이어 의존성 방향** - domain은 외부 의존성 없음, application은 domain만, infrastructure는 domain/shared 참조
2. **경로 별칭 필수 사용** - 크로스 레이어 import에 상대 경로(`../`) 대신 `@domain/*`, `@application/*` 등 사용
3. **barrel export 일관성** - 각 모듈 디렉토리에 `index.ts` 존재

## When to Run

- 새 파일을 `src/` 하위에 추가한 후
- import 문을 변경하거나 새 의존성을 추가한 후
- 레이어 간 새로운 참조를 도입한 후

## Related Files

| File | Purpose |
|------|---------|
| `src/domain/` | 순수 비즈니스 로직 (외부 의존성 없음) |
| `src/application/` | UseCase 레이어 (domain만 참조) |
| `src/infrastructure/` | 외부 시스템 구현체 |
| `src/interface/` | 진입점 (HTTP, Slack) |
| `src/shared/` | 공통 모듈 (Result, DomainError) |
| `src/config/` | DI 컨테이너, 환경 설정 |
| `tsconfig.json` | 경로 별칭 정의 |

## Workflow

### Step 1: domain 레이어 외부 의존성 금지

**검사:** `src/domain/` 내의 파일이 `@infrastructure`, `@interface`, `@application`, `@config` 를 import하지 않는지 확인합니다.

Grep 도구로 다음 패턴을 `src/domain/` 내에서 검색합니다:

```
패턴: from ['"]@(infrastructure|interface|application|config)/
경로: src/domain/
```

**PASS:** 매칭 결과 0건
**FAIL:** 매칭 발견 시 — domain 레이어에서 외부 레이어를 참조하고 있음

**수정:** 해당 import를 제거하거나, 필요한 인터페이스를 `src/domain/services/` 또는 `src/domain/repositories/`에 정의하고 infrastructure에서 구현하도록 변경

### Step 2: application 레이어 의존성 제한

**검사:** `src/application/` 내의 파일이 `@infrastructure`, `@interface`를 import하지 않는지 확인합니다.

Grep 도구로 다음 패턴을 `src/application/` 내에서 검색합니다:

```
패턴: from ['"]@(infrastructure|interface)/
경로: src/application/
```

**PASS:** 매칭 결과 0건
**FAIL:** 매칭 발견 시 — application 레이어에서 infrastructure/interface를 직접 참조하고 있음

**수정:** DI를 통해 인터페이스로 주입받도록 변경. `@domain/services/` 또는 `@domain/repositories/`의 인터페이스를 사용

### Step 3: 크로스 레이어 상대 경로 import 금지

**검사:** `src/` 내에서 `../` 를 사용한 크로스 레이어 import가 없는지 확인합니다. 같은 레이어 내 상대 경로는 허용합니다 (예: `./PrismaClient`).

Grep 도구로 다음 패턴을 `src/` 내에서 검색합니다:

```
패턴: from ['"]\.\./\.\./
경로: src/
포함: *.ts
```

이는 2단계 이상 상위로 올라가는 상대 경로를 탐지합니다 (크로스 레이어 가능성 높음).

**PASS:** 매칭 결과 0건
**FAIL:** 매칭 발견 시 — 경로 별칭을 사용해야 합니다

**수정:** `from '../../domain/entities'` → `from '@domain/entities'` 형식으로 변경

### Step 4: barrel export 존재 확인

**검사:** 주요 모듈 디렉토리에 `index.ts`가 존재하는지 확인합니다.

다음 파일들의 존재를 확인합니다:

```
src/domain/index.ts
src/domain/entities/index.ts
src/domain/repositories/index.ts
src/domain/services/index.ts
src/domain/value-objects/index.ts
src/application/index.ts
src/application/use-cases/index.ts
src/infrastructure/index.ts
src/shared/index.ts
src/shared/types/index.ts
src/shared/errors/index.ts
src/config/index.ts
src/interface/index.ts
```

**PASS:** 모든 파일 존재
**FAIL:** 누락된 index.ts 발견 시

**수정:** 해당 디렉토리에 `index.ts`를 생성하고 모듈의 public API를 re-export

## Output Format

```markdown
| # | 검사 | 상태 | 상세 |
|---|------|------|------|
| 1 | domain 외부 의존성 | PASS/FAIL | 위반 파일 목록 |
| 2 | application 의존성 제한 | PASS/FAIL | 위반 파일 목록 |
| 3 | 크로스 레이어 상대 경로 | PASS/FAIL | 위반 파일 목록 |
| 4 | barrel export 존재 | PASS/FAIL | 누락 파일 목록 |
```

## Exceptions

1. **`src/domain/` 내 `@shared/` import** - `@shared/types/Result`, `@shared/errors/DomainError` 등은 shared가 크로스커팅 레이어이므로 허용
2. **같은 레이어 내 상대 경로** - `./PrismaClient`, `./index` 등 동일 디렉토리나 하위 디렉토리 참조는 허용
3. **`src/config/container.ts`** - DI 컨테이너 설정 파일은 모든 레이어를 참조해야 하므로 의존성 방향 규칙에서 면제
4. **`src/server.ts`, `src/app.ts`** - 앱 부트스트랩 파일은 모든 레이어를 조합하므로 면제
