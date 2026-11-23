import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api/error';
import { getProfCabinetUser } from '@/lib/proAuth';
import { getProContextForRequest } from '@/lib/proContextRequest';
import { isProfMiniAppEnabled, isProfMiniAppPilotOpenForUser } from '@/lib/profMiniAppConfig';
import { assertMiniAppSession } from '@/lib/miniAppSessionCookie';
import { resolveMiniAppCertificateClientOptions } from '@/lib/miniAppCertificateOptions';
import { resolveMiniAppRoleForUser } from '@/lib/miniAppBootstrap';
import { guardMiniAppCertificateOptions } from '@/lib/miniAppRouteGuards';
import { resolveMiniAppWorkplaceBranchCatalog, validateMiniAppExplicitBranch } from '@/lib/miniAppPilotEligibility';
import { miniAppApiDynamic } from '@/lib/miniAppRouteSegment';
import { GET as availablePartnersGet } from '@/app/api/store/certificate/available-partners/route';

export const dynamic = miniAppApiDynamic.dynamic;
export const fetchCache = miniAppApiDynamic.fetchCache;
export const revalidate = miniAppApiDynamic.revalidate;

function parseHostPlatform(raw: string | null): 'telegram' | 'max' | null {
  const v = raw?.trim().toLowerCase();
  if (v === 'telegram' || v === 'tg') return 'telegram';
  if (v === 'max') return 'max';
  return null;
}

function privateNoStore(res: NextResponse) {
  res.headers.set('Cache-Control', 'private, no-store');
  return res;
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
    return privateNoStore(
      NextResponse.json(
        { error: sessionGuard.message, code: sessionGuard.code },
        { status: sessionGuard.status },
      ),
    );
  }

  const proCtx = await getProContextForRequest(req, user.id);
  const role = await resolveMiniAppRoleForUser(user.id, proCtx);
  let branchId = req.nextUrl.searchParams.get('branchId')?.trim() || null;

  if (!branchId && role && (role === 'store' || role === 'company')) {
    const catalog = await resolveMiniAppWorkplaceBranchCatalog(user.id, proCtx, role);
    if (catalog.length === 1) {
      const sole = await validateMiniAppExplicitBranch(user.id, proCtx, catalog[0]!.id);
      if (sole.ok) {
        branchId = sole.branchId;
      }
    }
  }

  const gate = await guardMiniAppCertificateOptions({ user, proCtx, role, branchId });
  if (!gate.ok) {
    return privateNoStore(
      NextResponse.json(
        { error: gate.failure.error, code: gate.failure.code },
        { status: gate.failure.status },
      ),
    );
  }

  const branchCatalog =
    role === 'store' || role === 'company'
      ? await resolveMiniAppWorkplaceBranchCatalog(user.id, proCtx, role)
      : [];
  if ((role === 'store' || role === 'company') && !branchId && branchCatalog.length > 1) {
    return privateNoStore(
      NextResponse.json({
        partners: [],
        selfScanPartner: null,
        miniClients: [],
        needsClient: true,
        needsBranch: true,
        miniOptionsBlocked: 'Выберите филиал выпуска на главном экране.',
      }),
    );
  }

  const partnersRes = await availablePartnersGet(req);
  const partnersBody = (await partnersRes.json()) as Record<string, unknown>;

  if (!partnersRes.ok) {
    return privateNoStore(NextResponse.json(partnersBody, { status: partnersRes.status }));
  }

  const clientSlice = await resolveMiniAppCertificateClientOptions({ user, branchId });
  if (!clientSlice.ok) {
    return privateNoStore(
      NextResponse.json({
        ...partnersBody,
        miniOptionsBlocked: clientSlice.blocked,
        miniClients: [],
        needsClient: true,
        needsBranch: branchId == null,
      }),
    );
  }

  return privateNoStore(
    NextResponse.json({
      ...partnersBody,
      miniClients: clientSlice.clients,
      needsClient: clientSlice.needsClient,
      needsBranch: clientSlice.needsBranch,
      miniOptionsBlocked: null,
    }),
  );
}