import { PrismaClient as BasePrismaClient } from '@prisma/client';

let prisma: BasePrismaClient | null = null;

/**
 * Prisma Client 싱글톤
 */
export function getPrismaClient(): BasePrismaClient {
  if (!prisma) {
    prisma = new BasePrismaClient({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });
  }
  return prisma;
}

/**
 * Prisma 연결 종료
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

export { BasePrismaClient as PrismaClient };
