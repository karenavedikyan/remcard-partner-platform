#!/usr/bin/env node
/** BFF smoke: status + draft through platform proxy with synthetic agent JWT. */
import { spawnSync } from "node:child_process";
import path from "node:path";

const PLATFORM = process.env.R02_PLATFORM_URL || "http://127.0.0.1:3000";
const NAV = process.env.R02_NAVIGATOR_DIR || path.resolve("/agent/repos/remcard-navigator");
const USER_ID = process.env.R02_SMOKE_USER_ID || "r02-bff-smoke-agent";

function ensureAgentUser(userId) {
  const cmd = `
import { prisma } from './src/lib/prisma';
import { UserRole, PartnerType } from '@prisma/client';
async function main() {
  await prisma.user.upsert({
    where: { id: '${userId}' },
    create: {
      id: '${userId}',
      publicId: 'RC-R02-BFF-SMOKE',
      role: UserRole.PRO,
      partnerType: PartnerType.COMPANY,
      partnerActivities: ['AGENT'],
      displayName: 'BFF Smoke Agent',
      city: 'Krasnodar',
    },
    update: { partnerActivities: ['AGENT'] },
  });
}
main().finally(() => prisma.$disconnect());
`;
  const res = spawnSync("pnpm", ["exec", "tsx", "-e", cmd], {
    cwd: NAV,
    encoding: "utf8",
    env: process.env,
  });
  if (res.status !== 0) throw new Error(res.stderr || res.stdout);
}

function mintToken(userId) {
  const cmd = `import { createToken } from './src/lib/auth'; process.stdout.write(createToken('${userId}', 0));`;
  const res = spawnSync("pnpm", ["exec", "tsx", "-e", cmd], {
    cwd: NAV,
    encoding: "utf8",
    env: process.env,
  });
  if (res.status !== 0) throw new Error(res.stderr || res.stdout);
  return res.stdout.trim();
}

async function main() {
  ensureAgentUser(USER_ID);
  const token = mintToken(USER_ID);
  const headers = { Cookie: `remcard-token=${token}` };
  const statusRes = await fetch(`${PLATFORM}/api/remcard/api/pro/agent-profile/status`, { headers });
  const draftRes = await fetch(`${PLATFORM}/api/remcard/api/pro/agent-profile/draft`, { headers });
  const out = {
    status: statusRes.status,
    draft: draftRes.status,
    statusBody: await statusRes.json().catch(() => null),
    draftBody: await draftRes.json().catch(() => null),
  };
  console.log(JSON.stringify(out, null, 2));
  if (statusRes.status !== 200 || draftRes.status !== 200) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
