import { remcardFetch, RemcardApiError } from "@/lib/api-client";
import { fetchReadinessSafe } from "@/lib/auth-session";
import type { CabinetReadiness } from "@/lib/cabinet-readiness";
import { isAuthFlowComplete } from "@/lib/auth-flow";

export type AgentFinishResponse = {
  ok: true;
  code: "completed" | "already_ready";
  userId: string;
  idempotentReplayed: boolean;
};

export async function postAgentRegistrationFinish(input: {
  displayName: string;
  city: string;
  idempotencyKey?: string;
}): Promise<AgentFinishResponse> {
  return remcardFetch<AgentFinishResponse>("/api/pro/registration/agent/finish", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: {
      displayName: input.displayName,
      city: input.city,
    },
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

export function mapAgentFinishError(error: unknown): string {
  if (error instanceof RemcardApiError) {
    const code = (error.body as { code?: string } | null)?.code;
    if (code === "MIXED_WALLET_BOUNDARY") {
      return "Смешанный профиль магазина или услуг: добавьте агента через профиль.";
    }
    if (code === "EXISTING_USER_NO_AUTO_AGENT" || code === "EXISTING_USER_NO_OVERWRITE") {
      return "Аккаунт уже настроен. Продолжите в кабинете или добавьте деятельность в профиле.";
    }
    if (code === "REGISTRATION_PATH_DISABLED") {
      return "Регистрация агента временно недоступна.";
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
