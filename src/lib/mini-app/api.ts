import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type { MiniAppBootstrap, MiniAppPlatform, MiniAppSessionResult } from "./types";

export async function miniAppExchangeSession(
  platform: MiniAppPlatform,
  initData: string,
): Promise<MiniAppSessionResult> {
  try {
    const body = await remcardFetch<{
      status: string;
      platform?: MiniAppPlatform;
      message?: string;
      profLoginUrl?: string;
      nextStep?: string;
    }>("/api/pro/mini-app/session", {
      method: "POST",
      body: { platform, initData },
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
      if (err.status === 404) {
        return { status: "error", message: "Пилот мини-кабинета отключён." };
      }
      return { status: "error", message: err.message };
    }
    return { status: "error", message: "Сетевая ошибка" };
  }
}

export async function miniAppFetchBootstrap(
  platform: MiniAppPlatform,
  branchId?: string | null,
): Promise<MiniAppBootstrap> {
  const params: Record<string, string> = { host: platform };
  if (branchId) params.branchId = branchId;
  return remcardFetch<MiniAppBootstrap>("/api/pro/mini-app/bootstrap", {
    searchParams: params,
    extraHeaders: { "x-remcard-mini-app-platform": platform },
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
  branchId?: string | null,
): Promise<MiniAppScanLookupResponse> {
  const params: Record<string, string> = { code, host: platform };
  if (branchId) params.branchId = branchId;
  return remcardFetch<MiniAppScanLookupResponse>("/api/pro/mini-app/scan", {
    searchParams: params,
    extraHeaders: { "x-remcard-mini-app-platform": platform },
  });
}

export async function miniAppCreateCertificate(
  platform: MiniAppPlatform,
  body: Record<string, unknown>,
  idempotencyKey: string,
): Promise<import("@/lib/certificate-types").StoreCertificate> {
  return remcardFetch("/api/store/certificate", {
    method: "POST",
    body,
    extraHeaders: {
      "x-remcard-mini-app-certificate-create": "1",
      "x-remcard-mini-app-platform": platform,
      "x-idempotency-key": idempotencyKey,
    },
  });
}