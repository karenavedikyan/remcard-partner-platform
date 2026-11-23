import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api/error';
import { getProContextForRequest } from '@/lib/proContextRequest';
import { buildMiniAppBootstrap } from '@/lib/miniAppBootstrap';
import { isProfMiniAppEnabled, isProfMiniAppPilotOpenForUser } from '@/lib/profMiniAppConfig';
import { prisma } from '@/lib/prisma';
import { assertMiniAppAccess } from '@/lib/miniAppSessionCookie';
import { getProfCabinetUserForMiniApp } from '@/lib/miniAppCabinetAuth';
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

  const user = await getProfCabinetUserForMiniApp(req, platform);
  if (!user) return apiError('UNAUTHORIZED');

  const sessionGuard = await assertMiniAppAccess(req, platform, user.id);
  if (!sessionGuard.ok) {
    return NextResponse.json(
      { error: sessionGuard.message, code: sessionGuard.code },
      { status: sessionGuard.status },
    );
  }

  const proCtx = await getProContextForRequest(req, user.id);
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { publicId: true, displayName: true },
  });
  if (!isProfMiniAppPilotOpenForUser({ userId: user.id, publicId: row?.publicId ?? null })) {
    return apiError('NOT_FOUND');
  }

  const explicitBranchId = req.nextUrl.searchParams.get('branchId')?.trim() || null;
  const contextBranchId = req.cookies.get('remcard-pro-branch')?.value?.trim() || null;
  const profAppOrigin = (
    process.env.NEXT_PUBLIC_PROF_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://prof.remcard.ru'
  ).replace(/\/+$/, '');

  const payload = await buildMiniAppBootstrap({
    userId: user.id,
    platform,
    proCtx,
    publicId: row?.publicId ?? null,
    displayName: row?.displayName ?? null,
    explicitBranchId,
    contextBranchId,
    profAppOrigin,
  });

  if ('error' in payload) {
    return NextResponse.json({ error: payload.error, code: payload.code }, { status: payload.status });
  }

  const res = NextResponse.json(payload);
  res.headers.set('Cache-Control', 'private, no-store');
  return res;
}