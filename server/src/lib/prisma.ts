/**
 * Prisma Client 单例
 * - 顶层先 loadEnv()，保证即使被其他模块 import 时 env 也已就绪（dotenv 幂等）
 */
import { PrismaClient } from '@prisma/client';
import { loadEnv } from './env';

loadEnv();

export const prisma = new PrismaClient();
