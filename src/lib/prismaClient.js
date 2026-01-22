/**
 * Prisma Client Utility
 * 
 * Centralized Prisma client with proper configuration
 * for server-side operations
 */

import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma client
const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma || new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Enable logging in development
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
