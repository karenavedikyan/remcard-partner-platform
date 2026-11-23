import type { NextRequest } from 'next/server';
import type { User } from '@prisma/client';
import { getProfCabinetUser } from '@/lib/proAuth';
import { assertCabinetProfAccess } from '@/lib/cabinetAccess';
import { prisma } from '@/lib/prisma';
import type { MiniAppPlatform } from '@/lib/miniAppSessionCookie';
import {
  resolveProfUserFromEmbeddedToken,
  resolveProfUserFromLaunchHeader,
} from '@/lib/miniAppEmbeddedAuth';

async function loadProfCabinetCandidate(userId: string): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt || user.isBlocked) return null;
  const access = await assertCabinetProfAccess(user);
  if (!access.ok) return null;
  return user;
}

/** Mini-app auth: first-party session, then partitioned embedded token, then launch-bound profile. */
export async function getProfCabinetUserForMiniApp(
  req: NextRequest,
  platform: MiniAppPlatform,
): Promise<User | null> {
  const sessionUser = await getProfCabinetUser(req);
  if (sessionUser) return sessionUser;

  const embeddedUser = await resolveProfUserFromEmbeddedToken(req);
  if (embeddedUser) {
    return loadProfCabinetCandidate(embeddedUser.id);
  }

  const launchUser = await resolveProfUserFromLaunchHeader(req, platform);
  if (launchUser) {
    return loadProfCabinetCandidate(launchUser.id);
  }

  return null;
}