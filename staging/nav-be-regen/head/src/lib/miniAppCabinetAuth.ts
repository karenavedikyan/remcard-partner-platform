import type { NextRequest } from 'next/server';
import type { User } from '@prisma/client';
import { getProfCabinetUser } from '@/lib/proAuth';
import { assertCabinetProfAccess } from '@/lib/cabinetAccess';
import type { MiniAppPlatform } from '@/lib/miniAppSessionCookie';
import { resolveProfUserFromEmbeddedToken } from '@/lib/miniAppEmbeddedAuth';

/** Mini-app auth: first-party session, then partitioned embedded JWT (same checks as getAuthenticatedUser). */
export async function getProfCabinetUserForMiniApp(
  req: NextRequest,
  _platform: MiniAppPlatform,
): Promise<User | null> {
  const sessionUser = await getProfCabinetUser(req);
  if (sessionUser) return sessionUser;

  const embeddedUser = await resolveProfUserFromEmbeddedToken(req);
  if (!embeddedUser) return null;

  const access = await assertCabinetProfAccess(embeddedUser);
  if (!access.ok) return null;

  return embeddedUser;
}