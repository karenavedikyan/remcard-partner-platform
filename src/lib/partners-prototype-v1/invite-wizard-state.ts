import {
  inviteTemplateById,
  type InviteMessageContext,
  type InviteMessageTemplateId,
} from "./invite-message-templates";

export type InviteWizardStep = "partner" | "message" | "review";

export const INVITE_WIZARD_STEPS: { id: InviteWizardStep; label: string }[] = [
  { id: "partner", label: "Партнёр" },
  { id: "message", label: "Сообщение" },
  { id: "review", label: "Проверка" },
];

export type InviteWizardCategory = {
  category: string;
  categoryLabel: string;
  /** Real published percent from recipient; null when requesting terms. */
  storePercent: number | null;
  selected: boolean;
};

export type InviteWizardSnapshot = {
  step: InviteWizardStep;
  recipientId: string | null;
  recipientName: string;
  agentOneWay: boolean;
  categories: InviteWizardCategory[];
  requestTerms: boolean;
  message: string;
  /** Last message applied from a template (for dirty detection). */
  lastTemplateMessage: string;
  lastTemplateId: InviteMessageTemplateId | null;
  customMessageDirty: boolean;
  /** Client idempotency key for final POST only. */
  submitIdempotencyKey: string | null;
  submitPending: boolean;
  submitDone: boolean;
  error: string;
};

export function createInviteWizardState(
  partial?: Partial<InviteWizardSnapshot>,
): InviteWizardSnapshot {
  return {
    step: "partner",
    recipientId: null,
    recipientName: "",
    agentOneWay: false,
    categories: [],
    requestTerms: false,
    message: "",
    lastTemplateMessage: "",
    lastTemplateId: null,
    customMessageDirty: false,
    submitIdempotencyKey: null,
    submitPending: false,
    submitDone: false,
    error: "",
    ...partial,
  };
}

export function selectedCategoryLines(state: InviteWizardSnapshot): string[] {
  return state.categories
    .filter((c) => c.selected)
    .map((c) =>
      c.storePercent == null
        ? c.categoryLabel
        : `${c.categoryLabel} — ${c.storePercent}%`,
    );
}

export function buildMessageContext(state: InviteWizardSnapshot, inviterName: string): InviteMessageContext {
  return {
    inviterName,
    recipientName: state.recipientName.trim() || "Партнёр",
    agentOneWay: state.agentOneWay,
    categoryLines: selectedCategoryLines(state),
    requestTerms: state.requestTerms,
  };
}

/** Applying a template when custom text differs requires confirmation. */
export function templateReplaceNeedsConfirm(state: InviteWizardSnapshot): boolean {
  if (!state.message.trim()) return false;
  if (!state.customMessageDirty) return false;
  if (state.message === state.lastTemplateMessage) return false;
  return true;
}

export function applyInviteTemplate(
  state: InviteWizardSnapshot,
  templateId: InviteMessageTemplateId,
  inviterName: string,
  opts?: { force?: boolean },
): InviteWizardSnapshot | { needsConfirm: true; nextMessage: string; templateId: InviteMessageTemplateId } {
  const template = inviteTemplateById(templateId);
  const nextMessage = template.build(buildMessageContext(state, inviterName));
  if (!opts?.force && templateReplaceNeedsConfirm(state)) {
    return { needsConfirm: true, nextMessage, templateId };
  }
  return {
    ...state,
    message: nextMessage,
    lastTemplateMessage: nextMessage,
    lastTemplateId: templateId,
    customMessageDirty: false,
    error: "",
  };
}

export function setInviteWizardMessage(
  state: InviteWizardSnapshot,
  message: string,
): InviteWizardSnapshot {
  const capped = message.slice(0, 1000);
  return {
    ...state,
    message: capped,
    customMessageDirty: capped !== state.lastTemplateMessage,
    error: "",
  };
}

/**
 * Changing recipient clears prior conditions/categories and does not silently
 * keep the previous addressee.
 */
export function setInviteWizardRecipient(
  state: InviteWizardSnapshot,
  input: {
    recipientId: string;
    recipientName: string;
    agentOneWay: boolean;
    categories: InviteWizardCategory[];
    requestTerms: boolean;
  },
): InviteWizardSnapshot {
  return {
    ...createInviteWizardState({
      step: state.step === "partner" ? "partner" : "message",
      recipientId: input.recipientId,
      recipientName: input.recipientName,
      agentOneWay: input.agentOneWay,
      categories: input.categories,
      requestTerms: input.requestTerms,
      // Clear prior message/conditions tied to previous recipient
      message: "",
      lastTemplateMessage: "",
      lastTemplateId: null,
      customMessageDirty: false,
      submitIdempotencyKey: null,
      submitPending: false,
      submitDone: false,
      error: "",
    }),
  };
}

export function toggleInviteWizardCategory(
  state: InviteWizardSnapshot,
  category: string,
  selected: boolean,
): InviteWizardSnapshot {
  return {
    ...state,
    categories: state.categories.map((c) =>
      c.category === category ? { ...c, selected } : c,
    ),
    // Changing categories invalidates template text unless user already customized
    customMessageDirty: state.customMessageDirty || Boolean(state.lastTemplateId),
  };
}

export function goInviteWizardStep(
  state: InviteWizardSnapshot,
  step: InviteWizardStep,
): InviteWizardSnapshot {
  if (step !== "partner" && !state.recipientId) {
    return { ...state, error: "Сначала выберите партнёра" };
  }
  if (step === "review" && !state.message.trim()) {
    return { ...state, error: "Добавьте текст сообщения" };
  }
  // Navigation between steps must NOT submit
  return { ...state, step, error: "" };
}

export function ensureInviteSubmitKey(state: InviteWizardSnapshot): InviteWizardSnapshot {
  if (state.submitIdempotencyKey) return state;
  const key =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `invite-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { ...state, submitIdempotencyKey: key };
}

export function markInviteSubmitPending(state: InviteWizardSnapshot): InviteWizardSnapshot {
  if (state.submitDone || state.submitPending) return state;
  return { ...ensureInviteSubmitKey(state), submitPending: true, error: "" };
}

export function markInviteSubmitDone(state: InviteWizardSnapshot): InviteWizardSnapshot {
  return { ...state, submitPending: false, submitDone: true };
}

export function markInviteSubmitFailed(
  state: InviteWizardSnapshot,
  error: string,
): InviteWizardSnapshot {
  return { ...state, submitPending: false, error };
}

/** Build share text for review step — exact message + separate conditions (reference wording). */
export function buildInviteShareText(state: InviteWizardSnapshot, recipientPath: string): {
  message: string;
  conditions: string;
  path: string;
} {
  const selected = state.categories.filter((c) => c.selected);
  let conditions: string;
  if (state.requestTerms || selected.every((c) => c.storePercent == null)) {
    conditions = "Прошу предложить условия сотрудничества.";
  } else if (selected.length === 0) {
    conditions = "Условия пока не указаны.";
  } else {
    conditions = [
      "Хочу сотрудничать по вашим опубликованным условиям:",
      ...selected.map((c) =>
        c.storePercent == null
          ? c.categoryLabel
          : `${c.categoryLabel}: общий процент ${c.storePercent}%`,
      ),
      "Общий процент включает скидку клиенту и бонус агенту. Это не размер гарантированного вознаграждения.",
    ].join("\n");
  }
  return {
    message: state.message.trim(),
    conditions,
    path: recipientPath,
  };
}
