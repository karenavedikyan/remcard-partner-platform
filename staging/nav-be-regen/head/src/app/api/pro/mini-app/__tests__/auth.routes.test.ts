import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockDispatch = vi.fn();
const mockVerify = vi.fn();
const mockValidateInit = vi.fn();
const mockPilotOpen = vi.fn();
const mockCabinet = vi.fn();
const mockApplyCookies = vi.fn();

vi.mock('@/lib/bots/miniAppLoginDispatch', () => ({
  dispatchMaxProfLoginCode: (...args: unknown[]) => mockDispatch(...args),
}));

vi.mock('@/lib/messengerAuthIdentity', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/messengerAuthIdentity')>();
  return {
    ...actual,
    verifyMessengerBotLoginCode: (...args: unknown[]) => mockVerify(...args),
  };
});

vi.mock('@/lib/messengerWebAppInitData', () => ({
  validateMessengerWebAppInitData: (...args: unknown[]) => mockValidateInit(...args),
}));

vi.mock('@/lib/profMiniAppConfig', () => ({
  isProfMiniAppEnabled: () => true,
  isProfMiniAppPilotOpenForUser: (...args: unknown[]) => mockPilotOpen(...args),
  profMiniAppMaxBotToken: () => 'max-token',
  profMiniAppTelegramBotToken: () => 'tg-token',
}));

vi.mock('@/lib/cabinetAccess', () => ({
  assertCabinetProfAccess: (...args: unknown[]) => mockCabinet(...args),
}));

vi.mock('@/lib/withRateLimit', () => ({
  withRateLimit: async () => null,
}));

vi.mock('@/lib/miniAppSessionCookie', () => ({
  applyMiniAppSessionCookies: (...args: unknown[]) => mockApplyCookies(...args),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'user-1',
        publicId: 'p1',
        tokenVersion: 1,
        maxId: BigInt(777),
        displayName: 'Test',
      }),
    },
    authAccount: {
      findUnique: vi.fn().mockResolvedValue({ userId: 'user-1' }),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  createToken: () => 'jwt-token',
}));

describe('mini-app auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateInit.mockReturnValue({ ok: true, data: { user: { id: 777 }, authDate: 1 } });
    mockPilotOpen.mockReturnValue(true);
    mockCabinet.mockResolvedValue({ ok: true });
  });

  it('POST send-code dispatches max prof login OTP', async () => {
    mockDispatch.mockResolvedValue({
      ok: true,
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      resendAfterSec: 60,
      botLoginCodeId: 'c1',
    });
    const { POST } = await import('../auth/send-code/route');
    const res = await POST(
      new NextRequest('https://x/api/pro/mini-app/auth/send-code', {
        method: 'POST',
        headers: { 'x-remcard-mini-app-platform': 'max' },
        body: JSON.stringify({ platform: 'max', initData: 'stub' }),
      }),
    );
    expect(res.status).toBe(200);
    expect(mockDispatch).toHaveBeenCalledWith(777);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.resendAfterSec).toBe(60);
  });

  it('POST verify-code sets embedded session cookies on success', async () => {
    mockVerify.mockResolvedValue({
      ok: true,
      user: { id: 'user-1', tokenVersion: 1, publicId: 'p1', maxId: BigInt(777) },
      created: false,
      entrySite: 'prof',
    });
    const { POST } = await import('../auth/verify-code/route');
    const res = await POST(
      new NextRequest('https://x/api/pro/mini-app/auth/verify-code', {
        method: 'POST',
        headers: { 'x-remcard-mini-app-platform': 'max' },
        body: JSON.stringify({
          platform: 'max',
          initData: 'stub',
          code: '123456',
          embedded: true,
          entrySite: 'prof',
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(mockVerify).toHaveBeenCalledWith('123456', 'prof');
    expect(mockApplyCookies).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ embedded: true, messengerUserId: 777, userId: 'user-1' }),
    );
  });
});