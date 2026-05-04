import { PrismaClient } from '@marppa-cloud/db';

declare global {
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export function getPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === 'production') {
    return createPrismaClient();
  }

  if (!globalThis.__prisma) {
    globalThis.__prisma = createPrismaClient();
  }

  return globalThis.__prisma;
}
