import { PrismaClient } from '@prisma/client';

// Singleton pattern for serverless: reuse PrismaClient across warm invocations
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
