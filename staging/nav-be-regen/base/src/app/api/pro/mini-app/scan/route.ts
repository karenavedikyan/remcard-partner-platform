import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api/error';
import { getProfCabinetUser } from '@/lib/proAuth';
import { isProfMiniAppEnabled, isProfMiniAppPilotOpenForUser } from '@/lib/profMiniAppConfig';
import { assertMiniAppSession } from '@/lib/miniAppSessionCookie';
import { miniAppReadOnlyCertificateScan } from '@/lib/miniAppCertificateScan';
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

export async function GET(req: NextRequest) {
  if (!isProfMiniAppEnabled()) {
    return apiError('NOT_FOUND');
  }

  const platform =
    parseHostPlatform(req.headers.get('x-remcard-mini-app-platform')) ??
    parseHostPlatform(req.nextUrl.searchParams.get('host'));
  if (!platform) {
    return apiError('BAD_REQUEST', 'Укажите платформу хоста');
  }

  const user = await getProfCabinetUser(req);
  if (!user) return apiError('UNAUTHORIZED');
  if (!isProfMiniAppPilotOpenForUser({ userId: user.id, publicId: user.publicId })) {
    return apiError('NOT_FOUND');
  }

  const sessionGuard = assertMiniAppSession(req, platform, user.id);
  if (!sessionGuard.ok) {
    return NextResponse.json(
      { state: 'forbidden', message: sessionGuard.message, code: sessionGuard.code },
      { status: sessionGuard.status },
    );
  }

  const code = req.nextUrl.searchParams.get('code')?.trim() || '';
  const branchId = req.nextUrl.searchParams.get('branchId')?.trim() || null;

  const result = await miniAppReadOnlyCertificateScan({
    userId: user.id,
    code,
    branchId,
  });

  const res = NextResponse.json(result);
  res.headers.set('Cache-Control', 'private, no-store');
  return res;
}