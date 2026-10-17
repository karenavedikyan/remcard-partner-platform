import { remcardFetch } from "@/lib/api-client";
import type { SpecialistDraftResponse, SpecialistR06Status } from "./types";

export function fetchSpecialistR06Status() {
  return remcardFetch<SpecialistR06Status>("/api/pro/r06/status");
}

export function fetchSpecialistProfileDraft() {
  return remcardFetch<SpecialistDraftResponse>("/api/pro/specialist-profile/draft");
}

export function patchSpecialistProfileDraft(body: {
  expectedVersion: number;
  step?: number;
  payload: Partial<SpecialistDraftResponse["payload"]>;
}) {
  return remcardFetch<SpecialistDraftResponse>("/api/pro/specialist-profile/draft", {
    method: "PATCH",
    body,
  });
}

export function finishSpecialistProfile(body: { expectedVersion: number }) {
  return remcardFetch<{ ok: boolean; contractVersion: string }>(
    "/api/pro/specialist-profile/finish",
    { method: "POST", body },
  );
}

export function discardSpecialistProfileDraft() {
  return remcardFetch<{ discarded: boolean }>("/api/pro/specialist-profile/draft", {
    method: "DELETE",
  });
}
