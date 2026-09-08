/**
 * Token 工具
 * - AccessToken：JWT(HS256)，默认 2h，无状态（校验走 jsonwebtoken）
 * - RefreshToken：随机 opaque 串，DB 只存 SHA-256 哈希，可撤销/轮换
 * - CollabTicket：HMAC 短时凭据，绑定 uid+role+docId（Step2 使用）
 */
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env, loadEnv } from './env';

loadEnv();

export interface AccessPayload {
  sub: string; // userId
  email: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

/** 签发 AccessToken */
export function signAccessToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email } satisfies AccessPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

/** 校验 AccessToken；失败抛 Unauthorized */
export function verifyAccessToken(token: string): AccessPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload & AccessPayload;
    return { sub: String(decoded.sub), email: decoded.email ?? '' };
  } catch {
    throw Object.assign(new Error('invalid access token'), { __invalidAuth: true });
  }
}

/** 生成 RefreshToken（明文返回给客户端，仅存哈希入库） */
export function issueRefreshToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(48).toString('hex');
  return { token, tokenHash: sha256(token) };
}

/** RefreshToken 哈希（DB 存此值，防拖库后明文复用） */
export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/** RefreshToken 有效期（毫秒） */
export function refreshExpiryMs(): number {
  return env.REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000;
}

// ---------------- Collab Ticket（Step2 使用，预留工具） ----------------

export interface TicketClaim {
  uid: string;
  role: 'owner' | 'viewer';
  doc: string;
  exp: number;
}

/** HMAC 签名短时 ticket：只放 query，即使入日志也在 60s 内失效、且绑定 docId 不可跨文档 */
export function signCollabTicket(claim: Omit<TicketClaim, 'exp'>): string {
  const payload = b64u(JSON.stringify({ ...claim, exp: Date.now() + env.COLLAB_TICKET_TTL_MS }));
  return `${payload}.${hmac(payload)}`;
}

export function verifyCollabTicket(ticket: string): TicketClaim | null {
  try {
    const [payload, sig] = String(ticket).split('.');
    if (!payload || !sig) return null;
    const expect = hmac(payload);
    const a = Buffer.from(sig);
    const b = Buffer.from(expect);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const claim = JSON.parse(Buffer.from(payload, 'base64url').toString()) as TicketClaim;
    if (claim.exp < Date.now()) return null;
    return claim;
  } catch {
    return null;
  }
}

function b64u(s: string): string {
  return Buffer.from(s).toString('base64url');
}
function hmac(payload: string): string {
  return crypto.createHmac('sha256', env.JWT_SECRET).update(payload).digest('base64url');
}
