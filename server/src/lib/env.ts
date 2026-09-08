/**
 * 环境变量加载
 * - 显式从 server/.env 加载（不依赖 cwd），dev(src/lib) 与 prod(dist/lib) 均为上两级到 server/
 * - loadEnv 幂等，可在多个模块顶层调用
 */
import { config } from 'dotenv';
import path from 'path';

export function loadEnv(): void {
  config({ path: path.resolve(__dirname, '..', '..', '.env') });
}

/** 集中读取环境变量（调用前确保已 loadEnv） */
export const env = {
  get PORT(): number {
    return Number(process.env.PORT ?? 3000);
  },
  get JWT_SECRET(): string {
    return process.env.JWT_SECRET ?? '';
  },
  get JWT_EXPIRES_IN(): string {
    return process.env.JWT_EXPIRES_IN ?? '2h';
  },
  get REFRESH_EXPIRES_DAYS(): number {
    return Number(process.env.REFRESH_EXPIRES_DAYS ?? 7);
  },
  get CORS_ORIGINS(): string[] {
    return (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  },
  get COLLAB_TICKET_TTL_MS(): number {
    return Number(process.env.COLLAB_TICKET_TTL_MS ?? 60_000);
  },
};
