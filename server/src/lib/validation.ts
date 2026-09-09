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

// ---- 文档（Step2） ----
export const createDocSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
});
export const renameDocSchema = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(255),
});
export const listDocsSchema = z.object({
  cursor: z.string().optional(), // 上一页最后一条 last_edited_at (ISO)
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type CreateDocInput = z.infer<typeof createDocSchema>;
export type RenameDocInput = z.infer<typeof renameDocSchema>;
