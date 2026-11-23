import type { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { validateMessengerWebAppInitData } from '@/lib/messengerWebAppInitData';
import { resolveMiniAppLinkedProfUser } from '@/lib/miniAppSession';
import { profMiniAppMaxBotToken, profMiniAppTelegramBotToken } from '@/lib/profMiniAppConfig';
import type { MessengerProvider } from '@/lib/messengerAuthIdentity';
import type { MiniAppPlatform } from '@/lib/miniAppSessionCookie';

export const MINI_APP_LAUNCH_HEADER = 'x-remcard-mini-app-launch';
export const MINI_APP_EMBEDDED_HEADER = 'x-remcard-mini-app-embedded';
export const MINI_APP_EMBEDDED_TOKEN_COOKIE = 'remcard-mini-app-embedded-token';
export const MINI_APP_EMBEDDED_BIND_COOKIE = 'remcard-mini-app-embedded-bind';

function providerFor(platform: MiniAppPlatform): MessengerProvider {
  return platform === 'telegram' ? 'TELEGRAM' : 'MAX';
}

export function isMiniAppEmbeddedRequest(req: NextRequest): boolean {
  return req.headers.get(MINI_APP_EMBEDDED_HEADER)?.trim() === '1';
}

export function readMiniAppLaunchInitData(req: NextRequest): string | null {
  const raw = req.headers.get(MINI_APP_LAUNCH_HEADER)?.trim();
  return raw || null;
}

export type EmbeddedCookieOption = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'none';
  path: string;
  maxAge: number;
  partitioned?: boolean;
};

export function miniAppEmbeddedCookieOptions(maxAge: number): EmbeddedCookieOption {
  const prod = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: prod,
    sameSite: prod ? 'none' : 'lax',
    path: '/',
    maxAge,
    ...(prod ? { partitioned: true } : {}),
  };
}

export function setMiniAppEmbeddedTokenCookie(res: NextResponse, token: string, maxAge: number): void {
  res.cookies.set(MINI_APP_EMBEDDED_TOKEN_COOKIE, token, miniAppEmbeddedCookieOptions(maxAge));
}

export type LaunchInitValidation =
  | { ok: true; messengerUserId: number }
  | { ok: false; code: string; message: string };

export function validateMiniAppLaunchInitData(
  req: NextRequest,
  platform: MiniAppPlatform,
): LaunchInitValidation {
  const initData = readMiniAppLaunchInitData(req);
  if (!initData) {
    return { ok: false, code: 'LAUNCH_MISSING', message: 'Нет данных запуска мини-приложения' };
  }
  const botToken = platform === 'telegram' ? profMiniAppTelegramBotToken() : profMiniAppMaxBotToken();
  const validated = validateMessengerWebAppInitData(initData, botToken);
  if (!validated.ok) {
    if (validated.code === 'EXPIRED') {
      return { ok: false, code: 'EXPIRED', message: 'Срок входа истёк. Закройте и снова откройте мини-приложение.' };
    }
    return { ok: false, code: 'INVALID_LAUNCH', message: 'Не удалось проверить вход мессенджера' };
  }
  return { ok: true, messengerUserId: validated.data.user.id };
}

export async function resolveProfUserFromLaunchHeader(
  req: NextRequest,
  platform: MiniAppPlatform,
) {
  const launch = validateMiniAppLaunchInitData(req, platform);
  if (!launch.ok) return null;
  const linked = await resolveMiniAppLinkedProfUser(providerFor(platform), launch.messengerUserId);
  if (linked.status !== 'linked') return null;
  return linked.user;
}

export function readEmbeddedAuthToken(req: NextRequest): string | null {
  return req.cookies.get(MINI_APP_EMBEDDED_TOKEN_COOKIE)?.value?.trim() || null;
}

export async function resolveProfUserFromEmbeddedToken(req: NextRequest) {
  const raw = readEmbeddedAuthToken(req);
  if (!raw) return null;
  const payload = verifyToken(raw);
  if (!payload?.userId) return null;
  const { prisma } = await import('@/lib/prisma');
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) return null;
  const { tokenVersionsMatch } = await import('@/lib/tokenVersion');
  if (!tokenVersionsMatch(payload.v, user.tokenVersion)) return null;
  if (user.deletedAt || user.isBlocked) return null;
  const { isRequestAuthSessionRevoked } = await import('@/lib/authSessionRevocation');
  if (await isRequestAuthSessionRevoked(req, payload)) return null;
  const { enforceProfTestPrincipalAccess } = await import('@/lib/profTestSessionValidator');
  const testAccess = await enforceProfTestPrincipalAccess(req, user, payload);
  if (testAccess === 'deny') return null;
  return user;
}