import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'remcard-mini-app-session';
const TTL_SECONDS = 30 * 24 * 60 * 60;

export type MiniAppPlatform = 'telegram' | 'max';

type SessionPayload = {
  v: 1;
  platform: MiniAppPlatform;
  messengerUserId: string;
  userId: string;
  exp: number;
};

function secret(): string {
  const s = process.env.JWT_SECRET?.trim() || '';
  if (!s) throw new Error('JWT_SECRET missing');
  return s;
}

function encode(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function decode(raw: string): SessionPayload | null {
  const parts = raw.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (payload.v !== 1) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (payload.platform !== 'telegram' && payload.platform !== 'max') return null;
    return payload;
  } catch {
    return null;
  }
}

export function setMiniAppSessionCookie(
  res: NextResponse,
  input: { platform: MiniAppPlatform; messengerUserId: number; userId: string },
): void {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const token = encode({
    v: 1,
    platform: input.platform,
    messengerUserId: String(input.messengerUserId),
    userId: input.userId,
    exp,
  });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_SECONDS,
  });
}

export function clearMiniAppSessionCookie(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export function readMiniAppSession(req: NextRequest): SessionPayload | null {
  const raw = req.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return decode(raw);
}

export type MiniAppSessionGuardResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; status: number; code: string; message: string };

export function assertMiniAppSession(
  req: NextRequest,
  platform: MiniAppPlatform,
  userId: string,
): MiniAppSessionGuardResult {
  const session = readMiniAppSession(req);
  if (!session) {
    return {
      ok: false,
      status: 401,
      code: 'MINI_SESSION_MISSING',
      message: 'Вход мини-приложения не подтверждён',
    };
  }
  if (session.platform !== platform) {
    return {
      ok: false,
      status: 403,
      code: 'MINI_PLATFORM_MISMATCH',
      message: 'Платформа не совпадает с подтверждённым входом',
    };
  }
  if (session.userId !== userId) {
    return {
      ok: false,
      status: 403,
      code: 'MINI_USER_MISMATCH',
      message: 'Сессия мини-приложения недействительна',
    };
  }
  return { ok: true, session };
}