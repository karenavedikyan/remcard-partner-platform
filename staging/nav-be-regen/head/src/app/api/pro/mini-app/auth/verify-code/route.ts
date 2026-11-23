import { NextRequest, NextResponse } from 'next/server';
import { createToken } from '@/lib/auth';
import { apiError } from '@/lib/api/error';
import { assertCabinetProfAccess } from '@/lib/cabinetAccess';
import { validateMessengerWebAppInitData } from '@/lib/messengerWebAppInitData';
import { verifyMessengerBotLoginCode } from '@/lib/messengerAuthIdentity';
import { parseVerifyEntrySite } from '@/lib/authEntryContext';
import {
  isProfMiniAppEnabled,
  isProfMiniAppPilotOpenForUser,
  profMiniAppMaxBotToken,
} from '@/lib/profMiniAppConfig';
import { withRateLimit } from '@/lib/withRateLimit';
import { applyMiniAppSessionCookies } from '@/lib/miniAppSessionCookie';
import { miniAppApiDynamic } from '@/lib/miniAppRouteSegment';

export const dynamic = miniAppApiDynamic.dynamic;
export const fetchCache = miniAppApiDynamic.fetchCache;
export const revalidate = miniAppApiDynamic.revalidate;

function parseHostPlatform(raw: string | null): 'max' | null {
  const v = raw?.trim().toLowerCase();
  if (v === 'max') return 'max';
  return null;
}

function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const c = raw.trim();
  return /^\d{6}$/.test(c) ? c : null;
}

export async function POST(req: NextRequest) {
  if (!isProfMiniAppEnabled()) {
    return apiError('NOT_FOUND');
  }

  const rateLimited = await withRateLimit(req, 'auth:verify-code');
  if (rateLimited) return rateLimited;

  const body = await req.json().catch(() => ({}));
  const initData = typeof body.initData === 'string' ? body.initData.trim() : '';
  const code = normalizeCode(body.code);
  const embedded = body.embedded === true;
  const platform =
    parseHostPlatform(typeof body.platform === 'string' ? body.platform : null) ??
    parseHostPlatform(req.headers.get('x-remcard-mini-app-platform'));
  const entrySite = parseVerifyEntrySite(body.entrySite) ?? 'prof';

  if (platform !== 'max') {
    return apiError('BAD_REQUEST', 'Код входа мини-приложения доступен только для MAX');
  }
  if (!initData) {
    return apiError('BAD_REQUEST', 'Нет данных входа мессенджера');
  }
  if (!code) {
    return apiError('BAD_REQUEST', 'Укажите шестизначный код');
  }

  const validated = validateMessengerWebAppInitData(initData, profMiniAppMaxBotToken());
  if (!validated.ok) {
    if (validated.code === 'EXPIRED') {
      return apiError('FORBIDDEN', 'Срок входа истёк. Закройте и снова откройте мини-приложение.');
    }
    return apiError('FORBIDDEN', 'Не удалось проверить вход мессенджера');
  }

  const verified = await verifyMessengerBotLoginCode(code, entrySite);
  if (!verified.ok) {
    const codeStr =
      verified.status === 401 && verified.error.includes('просроч')
        ? 'EXPIRED_CODE'
        : verified.status === 401
          ? 'INVALID_CODE'
          : 'VERIFY_FAILED';
    return NextResponse.json({ error: verified.error, code: codeStr }, { status: verified.status });
  }

  const messengerUserId = validated.data.user.id;
  const { prisma } = await import('@/lib/prisma');
  const fullUser = await prisma.user.findUnique({ where: { id: verified.user.id } });
  if (!fullUser) return apiError('NOT_FOUND');

  const ownsMax =
    fullUser.maxId?.toString() === String(messengerUserId) ||
    (await prisma.authAccount.findUnique({
      where: { provider_externalId: { provider: 'MAX', externalId: String(messengerUserId) } },
      select: { userId: true },
    }))?.userId === fullUser.id;
  if (!ownsMax) {
    return apiError('FORBIDDEN', 'Код не совпадает с аккаунтом MAX в мини-приложении');
  }

  const cabinet = await assertCabinetProfAccess(fullUser);
  if (!cabinet.ok) {
    return NextResponse.json(
      {
        status: 'cabinet_blocked',
        code: cabinet.errorCode,
        nextStep: cabinet.nextStep,
        missingConsents: cabinet.missingConsents,
      },
      { status: cabinet.status },
    );
  }

  if (!isProfMiniAppPilotOpenForUser({ userId: fullUser.id, publicId: fullUser.publicId })) {
    return apiError('FORBIDDEN', 'Доступ к пилоту мини-кабинета недоступен', undefined, {
      code: 'PROF_ACCESS_DENIED',
    });
  }

  const token = createToken(fullUser.id, fullUser.tokenVersion);
  const response = NextResponse.json({ status: 'ok', platform });
  applyMiniAppSessionCookies(response, {
    platform,
    messengerUserId,
    userId: fullUser.id,
    authToken: token,
    embedded,
  });
  return response;
}