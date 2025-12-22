import { ValidationError } from '@shared/errors/DomainError';

/**
 * 게시물 ID 값 객체
 */
export class PostId {
  private constructor(public readonly value: string) {}

  static create(value: string): PostId {
    if (!value || value.trim().length === 0) {
      throw new ValidationError('PostId는 빈 값일 수 없습니다');
    }
    return new PostId(value.trim());
  }

  equals(other: PostId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
