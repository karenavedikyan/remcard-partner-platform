#!/usr/bin/env tsx
/** MOCK cleanup — materialized under remcard-navigator/scripts for LOGIN-LAYOUT harness. */
import { prisma } from "../src/lib/prisma";
import { assertDisposableDatabaseUrl } from "./.login-layout-disposable-db-url-guard.mjs";

const tag = process.argv[2]?.trim();
if (!tag) {
  console.error("cleanup: missing fixture tag");
  process.exit(2);
}

const FIXTURE_MAX_ID = process.env.LOGIN_LAYOUT_FIXTURE_MAX_ID ?? "881001847291";
const publicId = `pub-${tag}`;

async function main() {
  if (process.env.LOGIN_LAYOUT_CLEANUP_INJECT_FAIL === "1") {
    console.error("cleanup: injected failure (LOGIN_LAYOUT_CLEANUP_INJECT_FAIL)");
    process.exit(3);
  }

  assertDisposableDatabaseUrl(process.env.DATABASE_URL ?? "", { label: "DATABASE_URL" });

  const user = await prisma.user.findUnique({ where: { publicId } });
  const deleted = { users: 0, authAccounts: 0, consents: 0, botLoginCodes: 0 };

  if (user) {
    const delConsents = await prisma.consent.deleteMany({ where: { userId: user.id } });
    deleted.consents = delConsents.count;
    const delAccounts = await prisma.authAccount.deleteMany({ where: { userId: user.id } });
    deleted.authAccounts = delAccounts.count;
    await prisma.user.delete({ where: { id: user.id } });
    deleted.users = 1;
    const delCodes = await prisma.botLoginCode.deleteMany({
      where: { identifier: `max:${FIXTURE_MAX_ID}` },
    });
    deleted.botLoginCodes = delCodes.count;
  }

  const remaining = {
    users: await prisma.user.count({ where: { publicId } }),
    authAccounts: user
      ? await prisma.authAccount.count({ where: { userId: user.id } })
      : 0,
    consents: user ? await prisma.consent.count({ where: { userId: user.id } }) : 0,
    botLoginCodes:
      deleted.users > 0
        ? await prisma.botLoginCode.count({ where: { identifier: `max:${FIXTURE_MAX_ID}` } })
        : 0,
  };

  const report = { mock: true, tag, publicId, deleted, remaining };
  process.stdout.write(`${JSON.stringify(report)}\n`);

  const leftover =
    remaining.users + remaining.authAccounts + remaining.consents + remaining.botLoginCodes;
  if (leftover > 0) {
    console.error(`cleanup: fixture rows remaining: ${JSON.stringify(remaining)}`);
    process.exit(4);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
