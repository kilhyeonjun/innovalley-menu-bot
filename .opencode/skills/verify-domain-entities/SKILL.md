---
name: verify-domain-entities
description: Entity/Value Object의 팩토리 메서드, 불변성, 영속화 패턴을 검증합니다. 도메인 모델 변경 후 사용.
---

# 도메인 엔티티 검증

## Purpose

도메인 엔티티와 값 객체의 구현 패턴 일관성을 검증합니다:

1. **private constructor + static factory** - 모든 Entity/VO가 private constructor와 `create()`, `fromPersistence()` 팩토리 메서드 사용
2. **Value Object 불변성** - VO는 `readonly` 프로퍼티만 사용하고 상태 변경 메서드 없음
3. **toPersistence() 메서드** - 모든 Entity에 영속화용 plain object 변환 메서드 존재
4. **Prisma 스키마 동기화** - Entity 필드와 Prisma 모델 필드 일치

## When to Run

- `src/domain/entities/` 또는 `src/domain/value-objects/`의 파일을 변경한 후
- `prisma/schema.prisma`를 수정한 후
- 새 Entity나 Value Object를 추가한 후

## Related Files

| File | Purpose |
|------|---------|
| `src/domain/entities/MenuPost.ts` | 식단표 엔티티 |
| `src/domain/entities/DeliveryHistory.ts` | 발송 이력 엔티티 |
| `src/domain/entities/index.ts` | 엔티티 barrel export |
| `src/domain/value-objects/PostId.ts` | 게시물 ID 값 객체 |
| `src/domain/value-objects/ImageUrl.ts` | 이미지 URL 값 객체 |
| `src/domain/value-objects/index.ts` | VO barrel export |
| `prisma/schema.prisma` | DB 스키마 정의 |

## Workflow

### Step 1: Entity private constructor 확인

**검사:** `src/domain/entities/`의 모든 클래스가 `private constructor`를 사용하는지 확인합니다.

Grep 도구로 클래스 선언과 constructor를 검색합니다:

```
패턴: export class \w+
경로: src/domain/entities/
포함: *.ts
제외: index.ts
```

찾은 각 Entity 파일을 읽어 `private constructor` 존재를 확인합니다.

**PASS:** 모든 Entity에 `private constructor` 존재
**FAIL:** public constructor를 가진 Entity 발견

**수정:** constructor를 `private`으로 변경하고 `static create()` 팩토리 메서드 추가

### Step 2: Entity 팩토리 메서드 확인

**검사:** 각 Entity에 `static create()`와 `static fromPersistence()` 메서드가 있는지 확인합니다.

Grep 도구로 팩토리 메서드를 검색합니다:

```
패턴: static (create|fromPersistence)\(
경로: src/domain/entities/
포함: *.ts
제외: index.ts
```

각 Entity 파일에서 두 메서드가 모두 존재하는지 확인합니다.

**PASS:** 모든 Entity에 `create()`와 `fromPersistence()` 존재
**FAIL:** 팩토리 메서드가 누락된 Entity 발견

**수정:** 누락된 팩토리 메서드를 기존 Entity 패턴에 맞춰 추가

### Step 3: Entity toPersistence() 메서드 확인

**검사:** 각 Entity에 `toPersistence()` 메서드가 있는지 확인합니다.

```
패턴: toPersistence\(\)
경로: src/domain/entities/
포함: *.ts
제외: index.ts
```

**PASS:** 모든 Entity에 `toPersistence()` 존재
**FAIL:** `toPersistence()`가 없는 Entity 발견

**수정:** Prisma 스키마를 참조하여 plain object를 반환하는 `toPersistence()` 메서드 추가

### Step 4: Value Object 패턴 확인

**검사:** `src/domain/value-objects/`의 모든 VO가 private constructor, `static create()`, `readonly` 프로퍼티를 사용하는지 확인합니다.

각 VO 파일을 읽어 다음을 확인합니다:
1. `private constructor` 존재
2. `static create()` 존재
3. 프로퍼티가 `readonly`로 선언됨
4. `equals()` 메서드 존재 (값 비교용)

```
패턴: export class \w+
경로: src/domain/value-objects/
포함: *.ts
제외: index.ts
```

**PASS:** 모든 VO가 패턴 준수
**FAIL:** 패턴을 위반하는 VO 발견

**수정:** 기존 `PostId.ts` 패턴을 참조하여 수정

### Step 5: Prisma 스키마 동기화 확인

**검사:** Entity의 `toPersistence()` 반환 필드와 Prisma 모델 필드가 일치하는지 확인합니다.

1. `prisma/schema.prisma`를 읽어 각 모델의 필드 목록 추출
2. 각 Entity의 `toPersistence()` 반환 타입의 필드 목록 추출
3. 두 목록 비교 (id, 자동 생성 필드 제외)

**PASS:** Entity 필드와 Prisma 모델 필드 일치
**FAIL:** 필드 불일치 발견

**수정:** Entity의 `toPersistence()` 또는 Prisma 스키마를 수정하여 동기화

## Output Format

```markdown
| # | 검사 | 상태 | 상세 |
|---|------|------|------|
| 1 | Entity private constructor | PASS/FAIL | 위반 파일 목록 |
| 2 | Entity 팩토리 메서드 | PASS/FAIL | 누락 메서드 목록 |
| 3 | Entity toPersistence() | PASS/FAIL | 누락 파일 목록 |
| 4 | Value Object 패턴 | PASS/FAIL | 위반 VO 목록 |
| 5 | Prisma 스키마 동기화 | PASS/FAIL | 불일치 필드 목록 |
```

## Exceptions

1. **Prisma 자동 생성 필드** - `id`(UUID), `crawledAt`(`@default(now())`)는 Entity의 `toPersistence()`에 포함하지 않아도 됨. Prisma가 자동 생성
2. **관계 필드** - `deliveryHistories DeliveryHistory[]` 같은 Prisma 관계 필드는 Entity에 대응 필드 불필요
3. **@@map 디렉티브** - Prisma의 `@@map("menu_posts")`은 테이블 이름 매핑이므로 Entity 필드와 무관
