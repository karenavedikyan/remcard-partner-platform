import type { ApiErrorBody } from "@/lib/api-client";
import { miniAppCabinetBlockedMessage } from "./auth-copy";

export type CabinetBlockedPayload = {
  status: "cabinet_blocked";
  message: string;
  nextStep?: string;
};

export function parseCabinetBlockedBody(
  body: ApiErrorBody | Record<string, unknown> | null,
  fallbackMessage?: string,
): CabinetBlockedPayload | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;
  if (raw.status !== "cabinet_blocked") return null;
  const nextStep = typeof raw.nextStep === "string" ? raw.nextStep : undefined;
  const fromBody =
    typeof raw.message === "string"
      ? raw.message
      : typeof raw.error === "string"
        ? raw.error
        : undefined;
  return {
    status: "cabinet_blocked",
    message: fromBody?.trim() || fallbackMessage || miniAppCabinetBlockedMessage(nextStep),
    nextStep,
  };
}