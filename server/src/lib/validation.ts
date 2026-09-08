/**
 * zod 校验 schema
 */
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确').max(255),
  password: z.string().min(8, '密码至少 8 位').max(72, '密码过长'),
  nickname: z.string().trim().min(1).max(32).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确').max(255),
  password: z.string().min(1, '密码不能为空').max(72),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
