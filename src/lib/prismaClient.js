/**
 * Prisma Client Utility
 * 
 * Centralized Prisma client with proper configuration
 * for server-side operations
 */

import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma client
const globalForPrisma = globalThis;

// Prevent instantiation during build if env is missing
const prisma = globalForPrisma.prisma || (process.env.DATABASE_URL ? new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Enable logging in development
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
}) : {
  // Mock client for build time - THROWS at runtime to alert missing config
  noDuesForm: {
    findUnique: () => { throw new Error('DATABASE_URL is missing - Mock Client Active'); },
    create: () => { throw new Error('DATABASE_URL is missing - Mock Client Active'); }
  },
  configSchool: { findUnique: () => null, create: () => null },
  configCourse: { findUnique: () => null, create: () => null },
  configBranch: { findUnique: () => null, create: () => null },
  department: { findMany: () => [] },
  noDuesStatus: { createMany: () => null },
  studentData: { upsert: () => null },
  $connect: () => Promise.resolve(),
  $disconnect: () => Promise.resolve(),
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
