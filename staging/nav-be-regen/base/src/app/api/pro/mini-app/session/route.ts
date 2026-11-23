import { NextRequest, NextResponse } from 'next/server';
import { createToken } from '@/lib/auth';
import { apiError } from '@/lib/api/error';
import { assertCabinetProfAccess } from '@/lib/cabinetAccess';
import { validateMessengerWebAppInitData } from '@/lib/messengerWebAppInitData';
import { resolveMiniAppLinkedProfUser } from '@/lib/miniAppSession';
import {
  isProfMiniAppEnabled,
  isProfMiniAppPilotOpenForUser,
  profMiniAppMaxBotToken,
  profMiniAppTelegramBotToken,
} from '@/lib/profMiniAppConfig';
import { prisma } from '@/lib/prisma';
import { withRateLimit } from '@/lib/withRateLimit';
import type { MessengerProvider } from '@/lib/messengerAuthIdentity';
import { setMiniAppSessionCookie } from '@/lib/miniAppSessionCookie';
import { miniAppApiDynamic } from '@/lib/miniAppRouteSegment';

export const dynamic = miniAppApiDynamic.dynamic;
export const fetchCache = miniAppApiDynamic.fetchCache;
export const revalidate = miniAppApiDynamic.revalidate;

function parseHostPlatform(raw: string | null): 'telegram' | 'max' | null {
  const v = raw?.trim().toLowerCase();
  if (v === 'telegram' || v === 'tg') return 'telegram';
  if (v === 'max') return 'max';
  return null;
}

function providerFor(platform: 'telegram' | 'max'): MessengerProvider {
  return platform === 'telegram' ? 'TELEGRAM' : 'MAX';
}

export async function POST(req: NextRequest) {
  if (!isProfMiniAppEnabled()) {
    return apiError('NOT_FOUND');
  }

  const rateLimited = await withRateLimit(req, 'pro:notification-bind');
  if (rateLimited) return rateLimited;

  const body = await req.json().catch(() => ({}));
  const initData = typeof body.initData === 'string' ? body.initData.trim() : '';
  const platform = parseHostPlatform(typeof body.platform === 'string' ? body.platform : null);
  if (!platform) {
    return apiError('BAD_REQUEST', 'Укажите platform: telegram или max');
  }
  if (!initData) {
    return apiError('BAD_REQUEST', 'Нет данных входа мессенджера');
  }

  const botToken = platform === 'telegram' ? profMiniAppTelegramBotToken() : profMiniAppMaxBotToken();
  const validated = validateMessengerWebAppInitData(initData, botToken);
  if (!validated.ok) {
    if (validated.code === 'EXPIRED') {
      return apiError('FORBIDDEN', 'Срок входа истёк. Закройте и снова откройте мини-приложение.');
    }
    if (validated.code === 'NO_BOT_TOKEN') {
      return apiError('NOT_FOUND');
    }
    return apiError('FORBIDDEN', 'Не удалось проверить вход мессенджера');
  }

  const linked = await resolveMiniAppLinkedProfUser(providerFor(platform), validated.data.user.id);
  if (linked.status === 'unlinked') {
    const profOrigin = (process.env.NEXT_PUBLIC_PROF_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://prof.remcard.ru').replace(/\/+$/, '');
    return NextResponse.json(
      {
        status: 'unlinked',
        code: 'MESSENGER_UNLINKED',
        message:
          'Этот аккаунт мессенджера не привязан к RemCard PROF. Войдите в кабинет на сайте и привяжите Telegram или MAX в настройках уведомлений.',
        profLoginUrl: `${profOrigin}/login?returnTo=${encodeURIComponent('/profile?section=notifications')}`,
      },
      { status: 403 },
    );
  }
  if (linked.status === 'unavailable') {
    return apiError('FORBIDDEN', linked.message);
  }

  const fullUser = await prisma.user.findUnique({ where: { id: linked.user.id } });
  if (!fullUser) return apiError('NOT_FOUND');

  if (!isProfMiniAppPilotOpenForUser({ userId: fullUser.id, publicId: fullUser.publicId })) {
    return apiError('NOT_FOUND');
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

  const token = createToken(fullUser.id, fullUser.tokenVersion);
  const response = NextResponse.json({
    status: 'ok',
    platform,
    user: {
      id: fullUser.id,
      publicId: fullUser.publicId,
      displayName: fullUser.displayName,
    },
  });
  response.cookies.set('remcard-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  });
  setMiniAppSessionCookie(response, {
    platform,
    messengerUserId: validated.data.user.id,
    userId: fullUser.id,
  });
  return response;
}