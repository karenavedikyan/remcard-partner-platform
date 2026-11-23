import { createHmac } from 'node:crypto';
import { describe, expect, it, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  MINI_APP_EMBEDDED_BIND_COOKIE,
  MINI_APP_EMBEDDED_HEADER,
  MINI_APP_LAUNCH_HEADER,
  miniAppEmbeddedCookieOptions,
  readMiniAppLaunchInitData,
} from '@/lib/miniAppEmbeddedAuth';
import {
  readEmbeddedBindCookie,
  setEmbeddedBindCookie,
  setMiniAppSessionCookie,
} from '@/lib/miniAppSessionCookie';

describe('miniAppEmbeddedAuth', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.MAX_BOT_TOKEN = 'max-token';
  });

  it('reads launch header', () => {
    const req = new NextRequest('http://localhost', {
      headers: { [MINI_APP_LAUNCH_HEADER]: 'user=1&auth_date=1' },
    });
    expect(readMiniAppLaunchInitData(req)).toBe('user=1&auth_date=1');
  });

  it('uses partitioned SameSite=None options only in production', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const prod = miniAppEmbeddedCookieOptions(60);
    expect(prod.sameSite).toBe('none');
    expect(prod.secure).toBe(true);
    expect(prod.partitioned).toBe(true);
    process.env.NODE_ENV = 'development';
    const dev = miniAppEmbeddedCookieOptions(60);
    expect(dev.sameSite).toBe('lax');
    expect(dev.partitioned).toBeUndefined();
    process.env.NODE_ENV = prev;
  });

  it('round-trips embedded bind cookie', () => {
    const res = NextResponse.json({ ok: true });
    setEmbeddedBindCookie(res, { platform: 'max', messengerUserId: 42, userId: 'user-1' }, true);
    const bind = res.cookies.get(MINI_APP_EMBEDDED_BIND_COOKIE)?.value;
    expect(bind).toBeTruthy();
    const req = new NextRequest('http://localhost', {
      headers: {
        cookie: `${MINI_APP_EMBEDDED_BIND_COOKIE}=${bind}`,
        [MINI_APP_EMBEDDED_HEADER]: '1',
      },
    });
    const session = readEmbeddedBindCookie(req);
    expect(session?.userId).toBe('user-1');
    expect(session?.platform).toBe('max');
  });

  it('keeps lax mini session independent from embedded bind', () => {
    const res = NextResponse.json({ ok: true });
    setMiniAppSessionCookie(res, { platform: 'telegram', messengerUserId: 9, userId: 'u' });
    const lax = res.cookies.get('remcard-mini-app-session');
    expect(lax?.sameSite).toBe('lax');
    expect(lax?.secure).toBe(false);
  });

  it('rejects tampered embedded bind payload', () => {
    const body = Buffer.from(
      JSON.stringify({
        v: 1,
        platform: 'max',
        messengerUserId: '1',
        userId: 'u',
        exp: 9_999_999_999,
      }),
      'utf8',
    ).toString('base64url');
    const sig = createHmac('sha256', 'test-secret').update(body).digest('base64url');
    const req = new NextRequest('http://localhost', {
      headers: { cookie: `${MINI_APP_EMBEDDED_BIND_COOKIE}=${body}.deadbeef` },
    });
    expect(readEmbeddedBindCookie(req)).toBeNull();
    const req2 = new NextRequest('http://localhost', {
      headers: { cookie: `${MINI_APP_EMBEDDED_BIND_COOKIE}=${body}.${sig}` },
    });
    expect(readEmbeddedBindCookie(req2)?.platform).toBe('max');
  });
});