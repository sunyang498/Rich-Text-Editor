/**
 * 认证业务逻辑：注册 / 登录 / 刷新 / 登出 / 当前用户
 */
import { prisma } from '../../lib/prisma';
import { Err } from '../../lib/http';
import { hashPassword, verifyPassword } from '../../lib/password';
import { signAccessToken, issueRefreshToken, sha256, refreshExpiryMs, type Tokens } from '../../lib/token';
import type { LoginInput, RegisterInput } from '../../lib/validation';

/** 对外暴露的用户信息（永不含 passwordHash） */
function publicUser(u: { id: string; email: string; nickname: string; createdAt: Date }) {
  return { id: u.id, email: u.email, nickname: u.nickname, createdAt: u.createdAt };
}

async function createTokenPair(userId: string): Promise<Tokens> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const accessToken = signAccessToken(user.id, user.email);
  const { token: refreshToken, tokenHash } = issueRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + refreshExpiryMs()),
    },
  });
  return { accessToken, refreshToken };
}

/** 注册（邮箱唯一；注册即登录） */
export async function register(input: RegisterInput) {
  const email = input.email.toLowerCase().trim();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw Err.Conflict('该邮箱已注册');

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(input.password),
      nickname: input.nickname?.trim() || email.split('@')[0],
    },
  });
  const tokens = await createTokenPair(user.id);
  return { user: publicUser(user), tokens };
}

/** 登录 */
export async function login(input: LoginInput) {
  const email = input.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });
  // 统一报错口径，避免暴露"邮箱是否存在"
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw Err.Unauthorized('邮箱或密码不正确');
  }
  const tokens = await createTokenPair(user.id);
  return { user: publicUser(user), tokens };
}

/** 刷新令牌（轮换：旧 refresh 撤销，签发新 pair） */
export async function refresh(refreshToken: string) {
  const tokenHash = sha256(refreshToken);
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!row || row.revokedAt || row.expiresAt < new Date()) {
    throw Err.InvalidRefresh();
  }
  // 轮换：旧令牌立即失效（防止重放）
  await prisma.refreshToken.update({
    where: { id: row.id },
    data: { revokedAt: new Date() },
  });
  const tokens = await createTokenPair(row.userId);
  return { tokens };
}

/** 登出：撤销指定 refresh 令牌（access token 无状态，自然过期） */
export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = sha256(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** 当前用户信息 */
export async function me(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Err.Unauthorized();
  return publicUser(user);
}
