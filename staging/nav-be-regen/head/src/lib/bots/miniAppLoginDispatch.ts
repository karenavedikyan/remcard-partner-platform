import { prisma } from '@/lib/prisma';
import { BOT_MSG_SEND_FAILED, prepareMessengerBotLogin } from '@/lib/messengerAuthIdentity';
import {
  buildBotLoginIdentifier,
  buildLoginCodeDigitsOnlyMessage,
  buildMaxLoginCodeMessage,
} from '@/lib/authEntryContext';
import { sendMaxMessage } from '@/lib/maxNotify';

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_AFTER_SEC = 60;

export type DispatchMaxProfLoginCodeResult =
  | { ok: true; expiresAt: Date; resendAfterSec: number; botLoginCodeId: string }
  | { ok: false; status: number; message: string; code?: string };

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send PROF-scoped MAX login OTP for mini-app embedded recovery (same rules as handleLoginMax).
 * Does not mutate bot webhook paths in commands.ts.
 */
export async function dispatchMaxProfLoginCode(
  messengerUserId: number | string | bigint,
): Promise<DispatchMaxProfLoginCodeResult> {
  const maxUserId = BigInt(messengerUserId);
  const ext = String(maxUserId);
  const prep = await prepareMessengerBotLogin('MAX', ext);
  if (!prep.ok) {
    return { ok: false, status: 409, message: prep.userMessage, code: prep.reason };
  }

  const site = 'prof' as const;
  const recent = await prisma.botLoginCode.findFirst({
    where: {
      identifier: buildBotLoginIdentifier('max', ext, site),
      used: false,
      expiresAt: { gt: new Date() },
      createdAt: { gt: new Date(Date.now() - RESEND_AFTER_SEC * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (recent) {
    return {
      ok: true,
      expiresAt: recent.expiresAt,
      resendAfterSec: RESEND_AFTER_SEC,
      botLoginCodeId: recent.id,
    };
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  const identifier = buildBotLoginIdentifier('max', ext, site);
  const created = await prisma.botLoginCode.create({
    data: { identifier, code, expiresAt },
  });

  const recipient = String(maxUserId);
  const explain = buildMaxLoginCodeMessage(site, code);
  let sendRes: Awaited<ReturnType<typeof sendMaxMessage>>;
  try {
    sendRes = await sendMaxMessage(recipient, explain);
  } catch {
    sendRes = { ok: false, reason: 'network', status: 502 };
  }
  if (!sendRes.ok) {
    await prisma.botLoginCode.delete({ where: { id: created.id } }).catch(() => undefined);
    await sendMaxMessage(recipient, BOT_MSG_SEND_FAILED).catch(() => undefined);
    return {
      ok: false,
      status: sendRes.status ?? 502,
      message: BOT_MSG_SEND_FAILED,
      code: 'SEND_FAILED',
    };
  }

  try {
    const digitsRes = await sendMaxMessage(recipient, buildLoginCodeDigitsOnlyMessage(code));
    if (!digitsRes.ok) {
      console.warn('[mini-app-login] digits-only follow-up failed', { reason: digitsRes.reason });
    }
  } catch {
    console.warn('[mini-app-login] digits-only follow-up failed', { reason: 'send_throw' });
  }

  return {
    ok: true,
    expiresAt,
    resendAfterSec: RESEND_AFTER_SEC,
    botLoginCodeId: created.id,
  };
}