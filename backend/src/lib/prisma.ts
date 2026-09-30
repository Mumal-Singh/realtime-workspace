import { PrismaClient } from '@prisma/client';

// single shared client, avoids exhausting postgres connections in dev with hot reload
export const prisma = new PrismaClient();
