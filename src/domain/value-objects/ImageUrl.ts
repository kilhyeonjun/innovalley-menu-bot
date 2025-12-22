import { ValidationError } from '@shared/errors/DomainError';

/**
 * 이미지 URL 값 객체
 */
export class ImageUrl {
  private constructor(public readonly value: string) {}

  static create(value: string): ImageUrl {
    if (!value || value.trim().length === 0) {
      throw new ValidationError('ImageUrl은 빈 값일 수 없습니다');
    }

    if (!ImageUrl.isValidUrl(value)) {
      throw new ValidationError(`유효하지 않은 이미지 URL입니다: ${value}`);
    }

    return new ImageUrl(value.trim());
  }

  private static isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * 카카오 CDN URL인지 확인
   */
  isKakaoCdn(): boolean {
    return (
      this.value.includes('kakaocdn.net') ||
      this.value.includes('daumcdn.net')
    );
  }

  equals(other: ImageUrl): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
