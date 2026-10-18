#!/usr/bin/env tsx
/** MOCK disposable DB seed — materialized under remcard-navigator/scripts for LOGIN-LAYOUT-01.2. */
import { UserRole } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { recordConsentIfMissing } from "../src/lib/consent";

const REQUIRED_DB = "remcard_admin_test_012";
const FIXTURE_OTP = process.env.LOGIN_LAYOUT_FIXTURE_OTP ?? "847291";
const FIXTURE_MAX_ID = BigInt(process.env.LOGIN_LAYOUT_FIXTURE_MAX_ID ?? "881001847291");
const TAG = process.env.LOGIN_LAYOUT_FIXTURE_TAG ?? `ll01-${Date.now()}`;

function assertDisposableDb() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.includes(REQUIRED_DB)) throw new Error(`Refusing seed: need ${REQUIRED_DB}`);
  const host = new URL(url.replace(/^postgresql:/, "http:")).hostname;
  if (!["127.0.0.1", "localhost", "::1"].includes(host)) {
    throw new Error(`Refusing seed: non-loopback ${host}`);
  }
}

async function purgeMaxIdFixtureUsers() {
  const stale = await prisma.user.findMany({
    where: { maxId: FIXTURE_MAX_ID },
    select: { id: true },
  });
  for (const u of stale) {
    await prisma.consent.deleteMany({ where: { userId: u.id } });
    await prisma.authAccount.deleteMany({ where: { userId: u.id } });
    await prisma.user.delete({ where: { id: u.id } });
  }
  await prisma.botLoginCode.deleteMany({ where: { identifier: `max:${String(FIXTURE_MAX_ID)}` } });
}

async function main() {
  assertDisposableDb();
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
      JSON.stringify({ mock: true, tag: TAG, userId: existing.id, publicId, otp: FIXTURE_OTP, reseed: true }),
    );
    return;
  }
  await purgeMaxIdFixtureUsers();
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
    console.error(e);
    process.exit(1);
  });
