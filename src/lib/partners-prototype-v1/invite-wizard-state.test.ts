import { describe, expect, it } from "vitest";
import {
  applyInviteTemplate,
  buildInviteShareText,
  createInviteWizardState,
  goInviteWizardStep,
  markInviteSubmitPending,
  setInviteWizardMessage,
  setInviteWizardRecipient,
  templateReplaceNeedsConfirm,
  toggleInviteWizardCategory,
} from "./invite-wizard-state";

describe("invite-wizard-state", () => {
  it("preserves custom message on back/change within same recipient", () => {
    let state = createInviteWizardState({
      step: "message",
      recipientId: "u1",
      recipientName: "Магазин",
      message: "мой текст",
      lastTemplateMessage: "шаблон",
      customMessageDirty: true,
    });
    state = goInviteWizardStep(state, "partner");
    expect(state.message).toBe("мой текст");
    state = goInviteWizardStep(state, "message");
    expect(state.message).toBe("мой текст");
  });

  it("requires confirm when replacing dirty custom text with template", () => {
    const state = createInviteWizardState({
      recipientId: "u1",
      recipientName: "Магазин А",
      message: "изменённый текст",
      lastTemplateMessage: "шаблон",
      customMessageDirty: true,
      categories: [
        { category: "doors", categoryLabel: "Двери", storePercent: 10, selected: true },
      ],
    });
    expect(templateReplaceNeedsConfirm(state)).toBe(true);
    const result = applyInviteTemplate(state, "short", "Иван");
    expect("needsConfirm" in result).toBe(true);
  });

  it("applies template when force or clean", () => {
    const state = createInviteWizardState({
      recipientId: "u1",
      recipientName: "Магазин А",
      agentOneWay: false,
      requestTerms: false,
      categories: [
        { category: "doors", categoryLabel: "Двери", storePercent: 12, selected: true },
      ],
    });
    const next = applyInviteTemplate(state, "short", "Иван");
    expect("needsConfirm" in next).toBe(false);
    if (!("needsConfirm" in next)) {
      // Exact reference short template: mutual proposal + RemCard registration CTA.
      expect(next.message).toContain("Давайте рекомендовать товары и услуги друг друга");
      expect(next.message).toContain("RemCard");
      expect(next.lastTemplateId).toBe("short");
    }
  });

  it("clears conditions and message when recipient changes", () => {
    const prev = createInviteWizardState({
      step: "review",
      recipientId: "old",
      recipientName: "Старый",
      message: "старое",
      categories: [
        { category: "doors", categoryLabel: "Двери", storePercent: 10, selected: true },
      ],
      submitIdempotencyKey: "keep-me-not",
    });
    const next = setInviteWizardRecipient(prev, {
      recipientId: "new",
      recipientName: "Новый",
      agentOneWay: true,
      categories: [],
      requestTerms: true,
    });
    expect(next.recipientId).toBe("new");
    expect(next.recipientName).toBe("Новый");
    expect(next.message).toBe("");
    expect(next.categories).toEqual([]);
    expect(next.requestTerms).toBe(true);
    expect(next.agentOneWay).toBe(true);
    expect(next.submitIdempotencyKey).toBeNull();
  });

  it("caps message at 1000 chars and tracks XSS-like / whitespace", () => {
    const long = "a".repeat(1200);
    const state = setInviteWizardMessage(createInviteWizardState(), long);
    expect(state.message).toHaveLength(1000);

    const xss = setInviteWizardMessage(
      createInviteWizardState(),
      '  <script>alert(1)</script>  ',
    );
    expect(xss.message).toContain("<script>");
    expect(xss.message.startsWith("  ")).toBe(true);
  });

  it("does not submit on step transitions; pending only via markInviteSubmitPending", () => {
    let state = createInviteWizardState({
      recipientId: "u1",
      recipientName: "X",
      message: "hi",
      step: "message",
    });
    state = goInviteWizardStep(state, "review");
    expect(state.submitPending).toBe(false);
    expect(state.submitDone).toBe(false);
    state = markInviteSubmitPending(state);
    expect(state.submitPending).toBe(true);
    expect(state.submitIdempotencyKey).toBeTruthy();
    const again = markInviteSubmitPending(state);
    expect(again.submitIdempotencyKey).toBe(state.submitIdempotencyKey);
  });

  it("keeps message and conditions separate in share payload", () => {
    const state = createInviteWizardState({
      message: "Текст приглашения",
      requestTerms: false,
      categories: [
        { category: "doors", categoryLabel: "Двери", storePercent: 8, selected: true },
        { category: "paint", categoryLabel: "Краска", storePercent: 5, selected: false },
      ],
    });
    const share = buildInviteShareText(state, "/invite/tok-abc");
    expect(share.message).toBe("Текст приглашения");
    expect(share.conditions).toContain("Двери: общий процент 8%");
    expect(share.conditions).not.toContain("Краска");
    expect(share.path).toBe("/invite/tok-abc");
  });

  it("toggles categories without inventing percents", () => {
    const state = createInviteWizardState({
      categories: [
        { category: "doors", categoryLabel: "Двери", storePercent: null, selected: true },
      ],
      requestTerms: true,
    });
    const next = toggleInviteWizardCategory(state, "doors", false);
    expect(next.categories[0].selected).toBe(false);
    expect(next.categories[0].storePercent).toBeNull();
  });
});
