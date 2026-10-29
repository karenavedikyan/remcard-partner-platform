import { describe, expect, it } from "vitest";
import {
  agentInviteProposal,
  applyInviteTemplate,
  buildInviteConditionsText,
  buildInviteShareText,
  createInviteWizardState,
  goInviteWizardStep,
  markInviteSubmitPending,
  selectedPublishedTermsForSubmit,
  setInviteTermField,
  setInviteTermsMode,
  setInviteWizardMessage,
  setInviteWizardRecipient,
  syncInviteWizardPublishedTerms,
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

  it("replaces dirty custom text with template immediately (no confirmation)", () => {
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
    expect(templateReplaceNeedsConfirm(state)).toBe(false);
    const next = applyInviteTemplate(state, "short", "Иван");
    expect(next.message).toContain("Давайте рекомендовать товары и услуги друг друга");
    expect(next.lastTemplateId).toBe("short");
    expect(next.customMessageDirty).toBe(false);
  });

  it("applies template when clean", () => {
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
    expect(next.message).toContain("Давайте рекомендовать товары и услуги друг друга");
    expect(next.message).toContain("RemCard");
    expect(next.lastTemplateId).toBe("short");
  });

  it("clears conditions and message when recipient changes", () => {
    const prev = createInviteWizardState({
      step: "review",
      recipientId: "old",
      recipientName: "Старый",
      message: "старое",
      partnerAction: "действие",
      partnerBenefit: "выгода",
      ownTerms: "мои",
      termsMode: "custom",
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
    expect(next.step).toBe("partner");
    expect(next.message).toBe("");
    expect(next.categories).toEqual([]);
    expect(next.requestTerms).toBe(true);
    expect(next.agentOneWay).toBe(true);
    expect(next.termsMode).toBe("published");
    expect(next.partnerAction).toBe("");
    expect(next.ownTerms).toBe("");
    expect(next.submitIdempotencyKey).toBeNull();
  });

  it("soft-syncs published terms for same recipient without clearing message/step", () => {
    const prev = createInviteWizardState({
      step: "message",
      recipientId: "same",
      recipientName: "Магазин",
      message: "Сохранить мой текст",
      partnerAction: "оставить",
      categories: [],
      requestTerms: true,
    });
    const next = syncInviteWizardPublishedTerms(prev, {
      recipientId: "same",
      recipientName: "Магазин",
      agentOneWay: false,
      categories: [
        { category: "doors", categoryLabel: "Двери", storePercent: 12, selected: true },
      ],
      requestTerms: false,
    });
    expect(next.step).toBe("message");
    expect(next.message).toBe("Сохранить мой текст");
    expect(next.partnerAction).toBe("оставить");
    expect(next.requestTerms).toBe(false);
    expect(next.categories[0]?.storePercent).toBe(12);
  });

  it("caps message at 1000 chars and tracks XSS-like / whitespace", () => {
    const long = "a".repeat(1200);
    const state = setInviteWizardMessage(createInviteWizardState(), long);
    expect(state.message).toHaveLength(1000);

    const xss = setInviteWizardMessage(
      createInviteWizardState(),
      "  <script>alert(1)</script>  ",
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

  it("builds reference conditions for published pool and custom mode", () => {
    const published = createInviteWizardState({
      message: "Текст приглашения",
      requestTerms: false,
      termsMode: "published",
      categories: [
        { category: "doors", categoryLabel: "Двери", storePercent: 8, selected: true },
        { category: "paint", categoryLabel: "Краска", storePercent: 5, selected: false },
      ],
    });
    const share = buildInviteShareText(published, "/invite/tok-abc");
    expect(share.message).toBe("Текст приглашения");
    expect(share.conditions).toContain("Двери: общий процент 8%");
    expect(share.conditions).not.toContain("Краска");
    expect(share.conditions).toContain("не размер гарантированного вознаграждения");
    expect(share.path).toBe("/invite/tok-abc");

    const custom = createInviteWizardState({
      agentOneWay: false,
      termsMode: "custom",
      partnerAction: "Рекомендовать двери",
      partnerBenefit: "10% бонус",
      ownTerms: "Взаимный обмен",
    });
    const text = buildInviteConditionsText(custom);
    expect(text).toContain("Моё предложение: Рекомендовать двери");
    expect(text).toContain("Желаемые условия: 10% бонус");
    expect(text).toContain("Мои условия за рекомендации: Взаимный обмен");
    expect(selectedPublishedTermsForSubmit(custom)).toEqual([]);
  });

  it("caps custom term fields at 250 and ignores ownTerms for agents", () => {
    const long = "x".repeat(300);
    let state = setInviteTermField(createInviteWizardState(), "partnerAction", long);
    expect(state.partnerAction).toHaveLength(250);

    state = setInviteTermField(
      createInviteWizardState({ agentOneWay: true }),
      "ownTerms",
      "не должно сохраниться",
    );
    expect(state.ownTerms).toBe("");

    state = setInviteTermsMode(
      createInviteWizardState({ agentOneWay: true }),
      "custom",
      { agentDefaultAction: agentInviteProposal() },
    );
    expect(state.termsMode).toBe("custom");
    expect(state.partnerAction).toContain("Предлагаю рекомендовать");
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
