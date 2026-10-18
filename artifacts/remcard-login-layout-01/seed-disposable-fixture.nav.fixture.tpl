#!/usr/bin/env tsx
/** MOCK disposable DB seed template (.fixture.tpl — not frontend TS). Materialized to remcard-navigator/scripts/*.ts */
import { UserRole } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { recordConsentIfMissing } from "../src/lib/consent";
import { assertDisposableDatabaseUrl } from "./.login-layout-disposable-db-url-guard.mjs";

const FIXTURE_OTP = process.env.LOGIN_LAYOUT_FIXTURE_OTP ?? "847291";
const FIXTURE_MAX_ID = BigInt(process.env.LOGIN_LAYOUT_FIXTURE_MAX_ID ?? "881001847291");
const TAG = process.env.LOGIN_LAYOUT_FIXTURE_TAG ?? `ll01-${Date.now()}`;

async function removeTagFixtureOnly(publicId: string) {
  const existing = await prisma.user.findUnique({ where: { publicId } });
  if (!existing) return;
  await prisma.consent.deleteMany({ where: { userId: existing.id } });
  await prisma.authAccount.deleteMany({ where: { userId: existing.id } });
  await prisma.user.delete({ where: { id: existing.id } });
  await prisma.botLoginCode.deleteMany({ where: { identifier: `max:${String(FIXTURE_MAX_ID)}` } });
}

async function main() {
  assertDisposableDatabaseUrl(process.env.DATABASE_URL ?? "", { label: "DATABASE_URL" });

  const publicId = `pub-${TAG}`;
  if (process.env.LOGIN_LAYOUT_RESEED === "1") {
    const existing = await prisma.user.findFirst({ where: { publicId } });
    if (!existing) throw new Error(`reseed: missing ${publicId}`);
    await prisma.botLoginCode.deleteMany({ where: { identifier: `max:${String(FIXTURE_MAX_ID)}` } });
    await prisma.botLoginCode.create({
      data: {
        identifier: `max:${String(FIXTURE_MAX_ID)}`,
        code: FIXTURE_OTP,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    process.stdout.write(
      JSON.stringify({
        mock: true,
        tag: TAG,
        userId: existing.id,
        publicId,
        otp: FIXTURE_OTP,
        maxId: String(FIXTURE_MAX_ID),
        reseed: true,
      }),
    );
    return;
  }

  const maxHolder = await prisma.user.findFirst({
    where: { maxId: FIXTURE_MAX_ID },
    select: { publicId: true },
  });
  if (maxHolder && maxHolder.publicId !== publicId) {
    throw new Error(
      `maxId already used by fixture ${maxHolder.publicId}; cleanup that tag first (no shared maxId purge)`,
    );
  }

  await removeTagFixtureOnly(publicId);

  const user = await prisma.user.create({
    data: {
      publicId,
      displayName: `LoginLayout MOCK ${TAG}`,
      role: UserRole.PRO,
      maxId: FIXTURE_MAX_ID,
      specializations: ["doors"],
      partnerActivities: ["AGENT"],
      isBlocked: false,
    },
  });
  await prisma.authAccount.create({
    data: { userId: user.id, provider: "MAX", externalId: String(FIXTURE_MAX_ID) },
  });
  for (const kind of ["PERSONAL_DATA", "TERMS"] as const) {
    await recordConsentIfMissing({ userId: user.id, kind, ip: null, ua: `mock:${TAG}` });
  }
  await prisma.botLoginCode.deleteMany({ where: { identifier: `max:${String(FIXTURE_MAX_ID)}` } });
  await prisma.botLoginCode.create({
    data: {
      identifier: `max:${String(FIXTURE_MAX_ID)}`,
      code: FIXTURE_OTP,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });
  process.stdout.write(
    JSON.stringify({
      mock: true,
      tag: TAG,
      userId: user.id,
      publicId,
      otp: FIXTURE_OTP,
      maxId: String(FIXTURE_MAX_ID),
    }),
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
