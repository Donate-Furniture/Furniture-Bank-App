import { PrismaClient } from '@prisma/client';

// This file sets up the boilerplate for the Prisma Client. Now, anywhere in your application (like your register or login API routes), 
// you can simply import this client and start querying the database using type-safe methods like prisma.user.create().

//Impact: This ensures that even if Next.js hot-reloads a dozen times per minute, your application maintains only one single, 
//stable database connection, preventing the "too many connections" error and ensuring stability throughout your 8-week contract.

// 1. Declare a variable to hold the PrismaClient instance globally
// This prevents hot-reloading in development from creating new connections
const prismaClientSingleton = () => {
  return new PrismaClient();
};

// Use globalThis to cache the instance across modules
type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton;
};

// 2. Initialize or retrieve the cached client
const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

export default prisma;

// 3. Ensure the client is cached during development
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;