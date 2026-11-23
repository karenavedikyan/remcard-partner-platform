import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest, NextResponse } from 'next/server';
import {
  MINI_APP_EMBEDDED_BIND_COOKIE,
  MINI_APP_EMBEDDED_HEADER,
  setMiniAppEmbeddedTokenCookie,
  validateMiniAppLaunchInitData,
  type EmbeddedCookieOption,
  miniAppEmbeddedCookieOptions,
} from '@/lib/miniAppEmbeddedAuth';
import { resolveMiniAppLinkedProfUser } from '@/lib/miniAppSession';
import type { MessengerProvider } from '@/lib/messengerAuthIdentity';

const COOKIE_NAME = 'remcard-mini-app-session';
const TTL_SECONDS = 30 * 24 * 60 * 60;
const AUTH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

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

function defaultSessionCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_SECONDS,
  };
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
  res.cookies.set(COOKIE_NAME, token, defaultSessionCookieOptions());
}

export function setEmbeddedBindCookie(
  res: NextResponse,
  input: { platform: MiniAppPlatform; messengerUserId: number; userId: string },
  embedded: boolean,
): void {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const token = encode({
    v: 1,
    platform: input.platform,
    messengerUserId: String(input.messengerUserId),
    userId: input.userId,
    exp,
  });
  const opts: EmbeddedCookieOption = embedded
    ? miniAppEmbeddedCookieOptions(TTL_SECONDS)
    : defaultSessionCookieOptions();
  res.cookies.set(MINI_APP_EMBEDDED_BIND_COOKIE, token, opts);
}

export function clearMiniAppSessionCookie(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 });
  res.cookies.set(MINI_APP_EMBEDDED_BIND_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export function readMiniAppSession(req: NextRequest): SessionPayload | null {
  const raw = req.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return decode(raw);
}

export function readEmbeddedBindCookie(req: NextRequest): SessionPayload | null {
  const raw = req.cookies.get(MINI_APP_EMBEDDED_BIND_COOKIE)?.value;
  if (!raw) return null;
  return decode(raw);
}

export type MiniAppSessionGuardResult =
  | { ok: true; session: SessionPayload; via: 'session' | 'embedded_bind' | 'launch_header' }
  | { ok: false; status: number; code: string; message: string };

function providerFor(platform: MiniAppPlatform): MessengerProvider {
  return platform === 'telegram' ? 'TELEGRAM' : 'MAX';
}

function guardSessionPayload(
  session: SessionPayload,
  platform: MiniAppPlatform,
  userId: string,
  via: MiniAppSessionGuardResult extends { ok: true; via: infer V } ? V : never,
): MiniAppSessionGuardResult {
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
  return { ok: true, session, via };
}

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
  return guardSessionPayload(session, platform, userId, 'session');
}

export async function assertMiniAppAccess(
  req: NextRequest,
  platform: MiniAppPlatform,
  userId: string,
): Promise<MiniAppSessionGuardResult> {
  const session = readMiniAppSession(req);
  if (session) {
    return guardSessionPayload(session, platform, userId, 'session');
  }

  const bind = readEmbeddedBindCookie(req);
  if (bind) {
    return guardSessionPayload(bind, platform, userId, 'embedded_bind');
  }

  const embedded = req.headers.get(MINI_APP_EMBEDDED_HEADER)?.trim() === '1';
  const launch = validateMiniAppLaunchInitData(req, platform);
  if (embedded) {
    if (!launch.ok) {
      return {
        ok: false,
        status: 401,
        code: 'MINI_EMBEDDED_SESSION_REQUIRED',
        message: launch.message,
      };
    }
    const linked = await resolveMiniAppLinkedProfUser(providerFor(platform), launch.messengerUserId);
    if (linked.status !== 'linked' || linked.user.id !== userId) {
      return {
        ok: false,
        status: 401,
        code: 'MINI_EMBEDDED_SESSION_REQUIRED',
        message: 'Вход мини-приложения не подтверждён',
      };
    }
    return {
      ok: true,
      session: {
        v: 1,
        platform,
        messengerUserId: String(launch.messengerUserId),
        userId,
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      via: 'launch_header',
    };
  }

  return {
    ok: false,
    status: 401,
    code: 'MINI_SESSION_MISSING',
    message: 'Вход мини-приложения не подтверждён',
  };
}

export function applyMiniAppSessionCookies(
  res: NextResponse,
  input: {
    platform: MiniAppPlatform;
    messengerUserId: number;
    userId: string;
    authToken: string;
    embedded?: boolean;
  },
): void {
  res.cookies.set('remcard-token', input.authToken, {
    ...defaultSessionCookieOptions(),
    maxAge: AUTH_COOKIE_MAX_AGE,
  });
  setMiniAppSessionCookie(res, {
    platform: input.platform,
    messengerUserId: input.messengerUserId,
    userId: input.userId,
  });
  if (input.embedded) {
    setMiniAppEmbeddedTokenCookie(res, input.authToken, AUTH_COOKIE_MAX_AGE);
    setEmbeddedBindCookie(
      res,
      {
        platform: input.platform,
        messengerUserId: input.messengerUserId,
        userId: input.userId,
      },
      true,
    );
  }
}