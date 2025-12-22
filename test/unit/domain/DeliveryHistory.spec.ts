import { describe, it, expect } from 'vitest';
import { DeliveryHistory } from '@domain/entities';
import { DeliveryHistoryBuilder } from '../../fixtures/builders';

describe('DeliveryHistory', () => {
  describe('create', () => {
    it('유효한 데이터로 생성한다', () => {
      const history = new DeliveryHistoryBuilder()
        .withPostId('post-123')
        .withChannel('C1234567890')
        .build();

      expect(history.postId.value).toBe('post-123');
      expect(history.channel).toBe('C1234567890');
    });

    it('id가 없으면 UUID를 자동 생성한다', () => {
      const history = DeliveryHistory.create({
        postId: 'post-123',
        channel: 'C1234567890',
      });

      expect(history.id).toBeDefined();
      expect(history.id.length).toBe(36); // UUID format
    });

    it('sentAt이 없으면 현재 시간으로 설정한다', () => {
      const before = new Date();
      const history = DeliveryHistory.create({
        postId: 'post-123',
        channel: 'C1234567890',
      });
      const after = new Date();

      expect(history.sentAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(history.sentAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('빈 postId는 ValidationError를 던진다', () => {
      expect(() =>
        DeliveryHistory.create({
          postId: '',
          channel: 'C1234567890',
        })
      ).toThrow('PostId는 빈 값일 수 없습니다');
    });
  });

  describe('fromPersistence', () => {
    it('DB 레코드에서 복원한다', () => {
      const sentAt = new Date('2024-12-16T09:00:00');
      const data = {
        id: 'uuid-123',
        postId: 'post-456',
        channel: 'C9876543210',
        sentAt,
      };

      const history = DeliveryHistory.fromPersistence(data);

      expect(history.id).toBe('uuid-123');
      expect(history.postId.value).toBe('post-456');
      expect(history.channel).toBe('C9876543210');
      expect(history.sentAt).toEqual(sentAt);
    });
  });

  describe('toPersistence', () => {
    it('영속화를 위한 plain object를 반환한다', () => {
      const sentAt = new Date('2024-12-16T09:00:00');
      const history = new DeliveryHistoryBuilder()
        .withId('uuid-789')
        .withPostId('post-123')
        .withChannel('C1234567890')
        .withSentAt(sentAt)
        .build();

      const persistence = history.toPersistence();

      expect(persistence).toEqual({
        id: 'uuid-789',
        postId: 'post-123',
        channel: 'C1234567890',
        sentAt,
      });
    });
  });
});
