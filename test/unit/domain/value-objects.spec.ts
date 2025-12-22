import { describe, it, expect } from 'vitest';
import { PostId, ImageUrl } from '@domain/value-objects';
import { ValidationError } from '@shared/errors/DomainError';

describe('PostId', () => {
  describe('create', () => {
    it('유효한 값으로 생성한다', () => {
      const postId = PostId.create('post-123');
      expect(postId.value).toBe('post-123');
    });

    it('공백을 제거한다', () => {
      const postId = PostId.create('  post-123  ');
      expect(postId.value).toBe('post-123');
    });

    it('빈 문자열은 ValidationError를 던진다', () => {
      expect(() => PostId.create('')).toThrow(ValidationError);
      expect(() => PostId.create('')).toThrow('PostId는 빈 값일 수 없습니다');
    });

    it('공백만 있는 문자열은 ValidationError를 던진다', () => {
      expect(() => PostId.create('   ')).toThrow(ValidationError);
    });
  });

  describe('equals', () => {
    it('같은 값이면 true를 반환한다', () => {
      const postId1 = PostId.create('post-123');
      const postId2 = PostId.create('post-123');
      expect(postId1.equals(postId2)).toBe(true);
    });

    it('다른 값이면 false를 반환한다', () => {
      const postId1 = PostId.create('post-123');
      const postId2 = PostId.create('post-456');
      expect(postId1.equals(postId2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('값을 문자열로 반환한다', () => {
      const postId = PostId.create('post-123');
      expect(postId.toString()).toBe('post-123');
    });
  });
});

describe('ImageUrl', () => {
  describe('create', () => {
    it('유효한 HTTPS URL로 생성한다', () => {
      const imageUrl = ImageUrl.create('https://example.com/image.jpg');
      expect(imageUrl.value).toBe('https://example.com/image.jpg');
    });

    it('유효한 HTTP URL로 생성한다', () => {
      const imageUrl = ImageUrl.create('http://example.com/image.jpg');
      expect(imageUrl.value).toBe('http://example.com/image.jpg');
    });

    it('카카오 CDN URL로 생성한다', () => {
      const imageUrl = ImageUrl.create('https://k.kakaocdn.net/dn/test/menu.jpg');
      expect(imageUrl.value).toBe('https://k.kakaocdn.net/dn/test/menu.jpg');
    });

    it('공백을 제거한다', () => {
      const imageUrl = ImageUrl.create('  https://example.com/image.jpg  ');
      expect(imageUrl.value).toBe('https://example.com/image.jpg');
    });

    it('빈 문자열은 ValidationError를 던진다', () => {
      expect(() => ImageUrl.create('')).toThrow(ValidationError);
      expect(() => ImageUrl.create('')).toThrow('ImageUrl은 빈 값일 수 없습니다');
    });

    it('유효하지 않은 URL은 ValidationError를 던진다', () => {
      expect(() => ImageUrl.create('not-a-url')).toThrow(ValidationError);
      expect(() => ImageUrl.create('not-a-url')).toThrow('유효하지 않은 이미지 URL입니다');
    });

    it('ftp 프로토콜은 ValidationError를 던진다', () => {
      expect(() => ImageUrl.create('ftp://example.com/image.jpg')).toThrow(ValidationError);
    });
  });

  describe('isKakaoCdn', () => {
    it('kakaocdn.net URL은 true를 반환한다', () => {
      const imageUrl = ImageUrl.create('https://k.kakaocdn.net/dn/test/menu.jpg');
      expect(imageUrl.isKakaoCdn()).toBe(true);
    });

    it('daumcdn.net URL은 true를 반환한다', () => {
      const imageUrl = ImageUrl.create('https://t1.daumcdn.net/test/image.jpg');
      expect(imageUrl.isKakaoCdn()).toBe(true);
    });

    it('다른 도메인은 false를 반환한다', () => {
      const imageUrl = ImageUrl.create('https://example.com/image.jpg');
      expect(imageUrl.isKakaoCdn()).toBe(false);
    });
  });

  describe('equals', () => {
    it('같은 URL이면 true를 반환한다', () => {
      const url1 = ImageUrl.create('https://example.com/image.jpg');
      const url2 = ImageUrl.create('https://example.com/image.jpg');
      expect(url1.equals(url2)).toBe(true);
    });

    it('다른 URL이면 false를 반환한다', () => {
      const url1 = ImageUrl.create('https://example.com/image1.jpg');
      const url2 = ImageUrl.create('https://example.com/image2.jpg');
      expect(url1.equals(url2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('URL을 문자열로 반환한다', () => {
      const imageUrl = ImageUrl.create('https://example.com/image.jpg');
      expect(imageUrl.toString()).toBe('https://example.com/image.jpg');
    });
  });
});
