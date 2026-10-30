import { describe, expect, it } from "vitest";
import type { Partnership } from "@/lib/types";
import {
  canOpenTermChange,
  cooperationActionLabel,
  discardTermDraftCopy,
  findPartnershipById,
  isPartnershipParticipant,
  partnershipAllowsUiAction,
  pauseConfirmCopy,
  resumeConfirmCopy,
  termChangeActionLabel,
} from "./partner-cooperation-c1";

function partnership(overrides: Partial<Partnership> = {}): Partnership {
  return {
    id: "p1",
    status: "ACTIVE",
    initiatedBy: "store-1",
    pendingProposedBy: null,
    note: null,
    createdAt: "",
    updatedAt: "",
    storeUserId: "store-1",
    proUserId: "agent-1",
    terms: [],
    storeUser: {
      id: "store-1",
      displayName: "Store",
      city: "Краснодар",
      specializations: [],
      storeCategories: [],
      partnerType: "STORE",
    },
    proUser: {
      id: "agent-1",
      displayName: "Agent",
      city: "Краснодар",
      specializations: [],
      storeCategories: [],
      partnerType: "COMPANY",
      partnerActivities: ["AGENT"],
    },
    ...overrides,
  };
}

describe("partner-cooperation-c1 guards/labels", () => {
  it("overrides pause/resume and term-change labels without touching rules strings", () => {
    expect(cooperationActionLabel("pause")).toBe("Приостановить сотрудничество");
    expect(cooperationActionLabel("resume")).toBe("Возобновить сотрудничество");
    expect(cooperationActionLabel("accept")).toBeNull();
    expect(termChangeActionLabel()).toBe("Изменить условия");
  });

  it("gates participant and ACTIVE term-change / pause-resume UI actions", () => {
    const active = partnership({ status: "ACTIVE" });
    const paused = partnership({ status: "PAUSED" });
    const stranger = partnership();

    expect(isPartnershipParticipant(active, "store-1")).toBe(true);
    expect(isPartnershipParticipant(stranger, "other")).toBe(false);

    expect(canOpenTermChange(active, "store-1")).toBe(true);
    expect(canOpenTermChange(paused, "store-1")).toBe(false);
    expect(canOpenTermChange(active, "other")).toBe(false);

    expect(partnershipAllowsUiAction(active, "store-1", "pause")).toBe(true);
    expect(partnershipAllowsUiAction(active, "store-1", "resume")).toBe(false);
    expect(partnershipAllowsUiAction(paused, "store-1", "resume")).toBe(true);
    expect(partnershipAllowsUiAction(active, "other", "pause")).toBe(false);
  });

  it("keeps pause/resume copy status-only (no delete / certificate legal guarantees)", () => {
    const pause = pauseConfirmCopy("Ателье");
    expect(pause.title).toContain("Ателье");
    expect(pause.body).toMatch(/Приостановлено/);
    expect(pause.body).toMatch(/не удаляется/i);
    expect(pause.body).toMatch(/условия самой связи сохраняются/i);
    expect(pause.body).toMatch(/уведомление/i);
    expect(pause.body.toLowerCase()).not.toMatch(/удалить|архив|гарант/);

    const resume = resumeConfirmCopy("Ателье");
    expect(resume.body).toMatch(/Действует/);
    expect(resume.body).toMatch(/не удаляется/i);

    const discard = discardTermDraftCopy();
    expect(discard.keep).toBe("Продолжить редактирование");
    expect(discard.discard).toBe("Закрыть без отправки");
  });

  it("resolves partnership by id from the bound list", () => {
    const a = partnership({ id: "a" });
    const b = partnership({ id: "b" });
    expect(findPartnershipById([a, b], "b")?.id).toBe("b");
    expect(findPartnershipById([a, b], "missing")).toBeUndefined();
  });
});
