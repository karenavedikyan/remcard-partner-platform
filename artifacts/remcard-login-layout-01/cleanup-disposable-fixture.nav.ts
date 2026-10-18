#!/usr/bin/env tsx
/** MOCK cleanup — materialized under remcard-navigator/scripts for LOGIN-LAYOUT-01.2. */
import { prisma } from "../src/lib/prisma";

const REQUIRED_DB = "remcard_admin_test_012";
const tag = process.argv[2]?.trim();
if (!tag || !(process.env.DATABASE_URL ?? "").includes(REQUIRED_DB)) process.exit(2);
const maxId = process.env.LOGIN_LAYOUT_FIXTURE_MAX_ID ?? "881001847291";

async function main() {
  await prisma.botLoginCode.deleteMany({ where: { identifier: `max:${maxId}` } });
  const users = await prisma.user.findMany({
    where: { publicId: { startsWith: `pub-${tag}` } },
    select: { id: true },
  });
  for (const u of users) {
    await prisma.consent.deleteMany({ where: { userId: u.id } });
    await prisma.authAccount.deleteMany({ where: { userId: u.id } });
    await prisma.user.delete({ where: { id: u.id } });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(() => process.exit(1));
