import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type {
  MiniAppAuthSendCodeResult,
  MiniAppAuthVerifyResult,
  MiniAppBootstrap,
  MiniAppPlatform,
  MiniAppSessionResult,
} from "./types";
import type { MiniAppEmbeddedContext } from "./embedded-context";
import { buildMiniAppExtraHeaders } from "./mini-app-request-headers";
import { miniAppUsesEmbeddedSession } from "./embedded-context";

type MiniAppCallOptions = {
  embeddedContext?: MiniAppEmbeddedContext;
  branchId?: string | null;
};

function miniHeaders(platform: MiniAppPlatform, opts?: MiniAppCallOptions): Record<string, string> {
  const ctx = opts?.embeddedContext ?? "default";
  return buildMiniAppExtraHeaders(platform, ctx);
}

export async function miniAppExchangeSession(
  platform: MiniAppPlatform,
  initData: string,
  opts?: MiniAppCallOptions,
): Promise<MiniAppSessionResult> {
  const embedded = miniAppUsesEmbeddedSession(opts?.embeddedContext ?? "default");
  try {
    const body = await remcardFetch<{
      status: string;
      platform?: MiniAppPlatform;
      message?: string;
      profLoginUrl?: string;
      nextStep?: string;
      code?: string;
    }>("/api/pro/mini-app/session", {
      method: "POST",
      body: { platform, initData, embedded },
      extraHeaders: miniHeaders(platform, opts),
    });
    if (body.status === "ok" && body.platform) {
      return { status: "ok", platform: body.platform };
    }
    return { status: "error", message: "Неожиданный ответ сервера" };
  } catch (err) {
    if (err instanceof RemcardApiError) {
      const code = err.body && typeof err.body === "object" ? (err.body as { code?: string }).code : undefined;
      if (code === "MESSENGER_UNLINKED") {
        const profLoginUrl =
          err.body && typeof err.body === "object"
            ? String((err.body as { profLoginUrl?: string }).profLoginUrl ?? "/login")
            : "/login";
        return {
          status: "unlinked",
          message: err.message,
          profLoginUrl,
        };
      }
      if (code === "MINI_SESSION_MISSING" || code === "MINI_EMBEDDED_SESSION_REQUIRED") {
        return {
          status: "session_missing",
          message: err.message,
          retryable: true,
        };
      }
      if (code === "PROF_ACCESS_DENIED" || code === "MINI_PILOT_CLOSED") {
        return { status: "no_access", message: err.message };
      }
      if (err.status === 404) {
        return { status: "error", message: "Пилот мини-кабинета отключён." };
      }
      const blocked = err.body as { status?: string; nextStep?: string } | null;
      if (blocked?.status === "cabinet_blocked") {
        return {
          status: "cabinet_blocked",
          nextStep: blocked.nextStep,
          message: err.message,
        };
      }
      return { status: "error", message: err.message };
    }
    return { status: "error", message: "Сетевая ошибка" };
  }
}

export async function miniAppSendLoginCode(
  platform: MiniAppPlatform,
  initData: string,
  opts?: MiniAppCallOptions,
): Promise<MiniAppAuthSendCodeResult> {
  try {
    const body = await remcardFetch<{ status: string; expiresAt?: string; resendAfterSec?: number }>(
      "/api/pro/mini-app/auth/send-code",
      {
        method: "POST",
        body: { platform, initData },
        extraHeaders: miniHeaders(platform, opts),
      },
    );
    if (body.status === "ok" && body.expiresAt) {
      return { status: "ok", expiresAt: body.expiresAt, resendAfterSec: body.resendAfterSec };
    }
    return { status: "error", message: "Не удалось запросить код" };
  } catch (err) {
    if (err instanceof RemcardApiError) {
      if (err.status === 403 || err.status === 409) {
        return { status: "blocked", message: err.message };
      }
      return { status: "error", message: err.message };
    }
    return { status: "error", message: "Сетевая ошибка" };
  }
}

export async function miniAppVerifyLoginCode(
  platform: MiniAppPlatform,
  initData: string,
  code: string,
  opts?: MiniAppCallOptions,
): Promise<MiniAppAuthVerifyResult> {
  const embedded = miniAppUsesEmbeddedSession(opts?.embeddedContext ?? "default");
  try {
    const body = await remcardFetch<{ status: string; platform?: MiniAppPlatform; nextStep?: string }>(
      "/api/pro/mini-app/auth/verify-code",
      {
        method: "POST",
        body: { platform, initData, code, embedded, entrySite: "prof" },
        extraHeaders: miniHeaders(platform, opts),
      },
    );
    if (body.status === "ok" && body.platform) {
      return { status: "ok", platform: body.platform };
    }
    return { status: "error", message: "Неожиданный ответ сервера" };
  } catch (err) {
    if (err instanceof RemcardApiError) {
      const codeStr =
        err.body && typeof err.body === "object" ? (err.body as { code?: string }).code : undefined;
      if (codeStr === "INVALID_CODE" || err.message.includes("Неверный")) {
        return { status: "invalid_code", message: err.message };
      }
      if (codeStr === "EXPIRED_CODE" || err.message.includes("просроч")) {
        return { status: "expired_code", message: err.message };
      }
      if (codeStr === "PROF_ACCESS_DENIED") {
        return { status: "no_prof_access", message: err.message };
      }
      const blocked = err.body as { status?: string; nextStep?: string } | null;
      if (blocked?.status === "cabinet_blocked") {
        return {
          status: "cabinet_blocked",
          message: err.message,
          nextStep: blocked.nextStep,
        };
      }
      return { status: "error", message: err.message };
    }
    return { status: "error", message: "Сетевая ошибка" };
  }
}

export type MiniAppCertificateOptionsResponse = import("@/lib/certificate-types").AvailablePartnersResponse & {
  miniClients: Array<{ id: string; displayName: string }>;
  needsClient: boolean;
  needsBranch: boolean;
  miniOptionsBlocked: string | null;
};

export async function miniAppFetchCertificateOptions(
  platform: MiniAppPlatform,
  opts?: MiniAppCallOptions,
): Promise<MiniAppCertificateOptionsResponse> {
  const params: Record<string, string> = { host: platform };
  if (opts?.branchId) params.branchId = opts.branchId;
  return remcardFetch<MiniAppCertificateOptionsResponse>("/api/pro/mini-app/certificate/options", {
    searchParams: params,
    extraHeaders: miniHeaders(platform, opts),
  });
}

export async function miniAppFetchBootstrap(
  platform: MiniAppPlatform,
  opts?: MiniAppCallOptions,
): Promise<MiniAppBootstrap> {
  const params: Record<string, string> = { host: platform };
  if (opts?.branchId) params.branchId = opts.branchId;
  return remcardFetch<MiniAppBootstrap>("/api/pro/mini-app/bootstrap", {
    searchParams: params,
    extraHeaders: miniHeaders(platform, opts),
  });
}

export type MiniAppScanState =
  | "valid"
  | "used"
  | "unknown"
  | "wrong_branch"
  | "forbidden"
  | "invalid_input";

export type MiniAppScanLookupResponse =
  | {
      state: "valid";
      clientDisplayName: string;
      promoCode: string;
      usageCount: number;
      maxUsages: number;
      certificateId: string;
    }
  | { state: Exclude<MiniAppScanState, "valid">; message: string };

export async function miniAppStoreScanLookup(
  platform: MiniAppPlatform,
  code: string,
  opts?: MiniAppCallOptions,
): Promise<MiniAppScanLookupResponse> {
  const params: Record<string, string> = { code, host: platform };
  if (opts?.branchId) params.branchId = opts.branchId;
  return remcardFetch<MiniAppScanLookupResponse>("/api/pro/mini-app/scan", {
    searchParams: params,
    extraHeaders: miniHeaders(platform, opts),
  });
}

export async function miniAppCreateCertificate(
  platform: MiniAppPlatform,
  body: Record<string, unknown>,
  idempotencyKey: string,
  opts?: MiniAppCallOptions,
): Promise<import("@/lib/certificate-types").StoreCertificate> {
  return remcardFetch("/api/pro/mini-app/certificate", {
    method: "POST",
    body,
    extraHeaders: {
      ...miniHeaders(platform, opts),
      "Idempotency-Key": idempotencyKey,
    },
  });
}