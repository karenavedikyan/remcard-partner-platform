import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api/error';
import { validateMessengerWebAppInitData } from '@/lib/messengerWebAppInitData';
import { isProfMiniAppEnabled, profMiniAppMaxBotToken } from '@/lib/profMiniAppConfig';
import { withRateLimit } from '@/lib/withRateLimit';
import { dispatchMaxProfLoginCode } from '@/lib/bots/miniAppLoginDispatch';
import { miniAppApiDynamic } from '@/lib/miniAppRouteSegment';

export const dynamic = miniAppApiDynamic.dynamic;
export const fetchCache = miniAppApiDynamic.fetchCache;
export const revalidate = miniAppApiDynamic.revalidate;

function parseHostPlatform(raw: string | null): 'max' | null {
  const v = raw?.trim().toLowerCase();
  if (v === 'max') return 'max';
  return null;
}

export async function POST(req: NextRequest) {
  if (!isProfMiniAppEnabled()) {
    return apiError('NOT_FOUND');
  }

  const rateLimited = await withRateLimit(req, 'auth:verify-code');
  if (rateLimited) return rateLimited;

  const body = await req.json().catch(() => ({}));
  const initData = typeof body.initData === 'string' ? body.initData.trim() : '';
  const platform =
    parseHostPlatform(typeof body.platform === 'string' ? body.platform : null) ??
    parseHostPlatform(req.headers.get('x-remcard-mini-app-platform'));
  if (platform !== 'max') {
    return apiError('BAD_REQUEST', 'Код входа мини-приложения доступен только для MAX');
  }
  if (!initData) {
    return apiError('BAD_REQUEST', 'Нет данных входа мессенджера');
  }

  const validated = validateMessengerWebAppInitData(initData, profMiniAppMaxBotToken());
  if (!validated.ok) {
    if (validated.code === 'EXPIRED') {
      return apiError('FORBIDDEN', 'Срок входа истёк. Закройте и снова откройте мини-приложение.');
    }
    if (validated.code === 'NO_BOT_TOKEN') {
      return apiError('NOT_FOUND');
    }
    return apiError('FORBIDDEN', 'Не удалось проверить вход мессенджера');
  }

  const dispatch = await dispatchMaxProfLoginCode(validated.data.user.id);
  if (!dispatch.ok) {
    return NextResponse.json(
      { error: dispatch.message, code: dispatch.code ?? 'SEND_FAILED' },
      { status: dispatch.status },
    );
  }

  return NextResponse.json({
    status: 'ok',
    expiresAt: dispatch.expiresAt.toISOString(),
    resendAfterSec: dispatch.resendAfterSec,
  });
}