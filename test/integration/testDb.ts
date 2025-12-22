import { PrismaClient } from '@prisma/client';

let testPrisma: PrismaClient | null = null;

/**
 * 테스트용 Prisma 클라이언트 가져오기
 */
export function getTestPrisma(): PrismaClient {
  if (!testPrisma) {
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: 'file:./test.db',
        },
      },
    });
  }
  return testPrisma;
}

/**
 * 테스트 DB 초기화 (모든 데이터 삭제)
 */
export async function cleanupTestDb(): Promise<void> {
  const prisma = getTestPrisma();
  // 외래키 제약 조건으로 인해 순서대로 삭제
  await prisma.deliveryHistory.deleteMany();
  await prisma.menuPost.deleteMany();
}

/**
 * 테스트 DB 연결 종료
 */
export async function disconnectTestDb(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = null;
  }
}
