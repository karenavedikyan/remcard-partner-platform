import { remcardFetch, RemcardApiError } from "@/lib/api-client";
import { fetchReadinessSafe } from "@/lib/auth-session";
import type { CabinetReadiness } from "@/lib/cabinet-readiness";
import { isAuthFlowComplete } from "@/lib/auth-flow";
import type { RegistrationKind } from "@/lib/registration/types";

export type JoinFinishResponse = {
  ok: true;
  code: "completed" | "already_ready";
  userId: string;
  idempotentReplayed: boolean;
};

const JOIN_KINDS = new Set<RegistrationKind>(["agent", "specialist", "store", "company"]);

export function isJoinRegistrationKind(kind: RegistrationKind | ""): kind is RegistrationKind {
  return kind !== "" && JOIN_KINDS.has(kind);
}

export async function postRegistrationJoinFinish(input: {
  kind: RegistrationKind;
  displayName: string;
  city: string;
  idempotencyKey?: string;
}): Promise<JoinFinishResponse> {
  const path =
    input.kind === "agent"
      ? "/api/pro/registration/agent/finish"
      : "/api/pro/registration/join/finish";
  const body =
    input.kind === "agent"
      ? { displayName: input.displayName, city: input.city }
      : { kind: input.kind, displayName: input.displayName, city: input.city };

  return remcardFetch<JoinFinishResponse>(path, {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body,
  });
}

export async function waitForRegistrationReady(
  attempts = 5,
  delayMs = 400,
): Promise<CabinetReadiness | null> {
  for (let i = 0; i < attempts; i += 1) {
    const readiness = await fetchReadinessSafe();
    if (readiness.ok && isAuthFlowComplete(readiness.data)) {
      return readiness.data;
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  const last = await fetchReadinessSafe();
  return last.ok ? last.data : null;
}

export function mapJoinFinishError(error: unknown): string {
  if (error instanceof RemcardApiError) {
    const code = (error.body as { code?: string } | null)?.code;
    if (code === "MIXED_WALLET_BOUNDARY") {
      return "Смешанный профиль магазина или услуг: добавьте агента через профиль.";
    }
    if (code === "EXISTING_USER_NO_AUTO_AGENT" || code === "EXISTING_USER_NO_OVERWRITE") {
      return "Аккаунт уже настроен. Продолжите в кабинете или подтвердите новую регистрацию.";
    }
    if (code === "CONSENTS_REQUIRED") {
      return "Примите актуальные соглашения и повторите завершение регистрации.";
    }
    if (code === "REGISTRATION_PATH_DISABLED") {
      return "Новая регистрация временно недоступна.";
    }
    if (code === "INVALID_BODY") {
      return "Проверьте имя и город.";
    }
    if (error.status === 401) {
      return "Сессия завершилась. Войдите снова.";
    }
    return error.message || "Не удалось завершить регистрацию.";
  }
  return "Не удалось завершить регистрацию. Повторите попытку.";
}
