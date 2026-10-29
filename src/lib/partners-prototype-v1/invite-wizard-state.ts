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

export type InviteTermsMode = "published" | "custom";

export type InviteWizardSnapshot = {
  step: InviteWizardStep;
  recipientId: string | null;
  recipientName: string;
  agentOneWay: boolean;
  categories: InviteWizardCategory[];
  requestTerms: boolean;
  /** Review-step source of conditions — exact reference termsMode. */
  termsMode: InviteTermsMode;
  /** Custom proposal fields (max 250); ownTerms only for non-agents. */
  partnerAction: string;
  partnerBenefit: string;
  ownTerms: string;
  message: string;
  /** Last message applied from a template (for dirty / aria-pressed). */
  lastTemplateMessage: string;
  lastTemplateId: InviteMessageTemplateId | null;
  customMessageDirty: boolean;
  /** Client idempotency key for final POST only. */
  submitIdempotencyKey: string | null;
  submitPending: boolean;
  submitDone: boolean;
  error: string;
};

const TERM_FIELD_MAX = 250;

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
    termsMode: "published",
    partnerAction: "",
    partnerBenefit: "",
    ownTerms: "",
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

/**
 * Exact reference: template click replaces subject immediately — no confirmation.
 * Kept for tests/docs that previously mentioned dirty-confirm; always false now.
 */
export function templateReplaceNeedsConfirm(_state: InviteWizardSnapshot): boolean {
  return false;
}

/** Immediate replace — matches partners-redesign.js data-invite-template handler. */
export function applyInviteTemplate(
  state: InviteWizardSnapshot,
  templateId: InviteMessageTemplateId,
  inviterName: string,
  _opts?: { force?: boolean },
): InviteWizardSnapshot {
  const template = inviteTemplateById(templateId);
  const nextMessage = template.build(buildMessageContext(state, inviterName));
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
    // Typing own text clears template highlight (reference: template = "").
    lastTemplateId:
      capped !== state.lastTemplateMessage ? null : state.lastTemplateId,
    error: "",
  };
}

export type InviteWizardRecipientInput = {
  recipientId: string;
  recipientName: string;
  agentOneWay: boolean;
  categories: InviteWizardCategory[];
  requestTerms: boolean;
};

/**
 * Changing recipient clears prior conditions/categories and does not silently
 * keep the previous addressee.
 */
export function setInviteWizardRecipient(
  state: InviteWizardSnapshot,
  input: InviteWizardRecipientInput,
): InviteWizardSnapshot {
  return {
    ...createInviteWizardState({
      step: "partner",
      recipientId: input.recipientId,
      recipientName: input.recipientName,
      agentOneWay: input.agentOneWay,
      categories: input.categories,
      requestTerms: input.requestTerms,
      termsMode: "published",
      partnerAction: "",
      partnerBenefit: "",
      ownTerms: "",
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

/**
 * Same recipient: refresh published terms/categories without wiping step/message
 * or custom term fields. Different recipient: hard reset.
 */
export function syncInviteWizardPublishedTerms(
  state: InviteWizardSnapshot,
  input: InviteWizardRecipientInput,
): InviteWizardSnapshot {
  if (state.recipientId !== input.recipientId) {
    return setInviteWizardRecipient(state, input);
  }
  return {
    ...state,
    recipientName: input.recipientName,
    agentOneWay: input.agentOneWay,
    categories: input.categories,
    requestTerms: input.requestTerms,
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
  };
}

export function setInviteTermsMode(
  state: InviteWizardSnapshot,
  termsMode: InviteTermsMode,
  opts?: { agentDefaultAction?: string },
): InviteWizardSnapshot {
  const next = { ...state, termsMode, error: "" };
  if (
    termsMode === "custom" &&
    state.agentOneWay &&
    !state.partnerAction.trim() &&
    opts?.agentDefaultAction
  ) {
    next.partnerAction = opts.agentDefaultAction.slice(0, TERM_FIELD_MAX);
  }
  return next;
}

export function setInviteTermField(
  state: InviteWizardSnapshot,
  field: "partnerAction" | "partnerBenefit" | "ownTerms",
  value: string,
): InviteWizardSnapshot {
  // ownTerms is non-agent only — ignore writes for agents.
  if (field === "ownTerms" && state.agentOneWay) {
    return state;
  }
  return {
    ...state,
    [field]: value.slice(0, TERM_FIELD_MAX),
    error: "",
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
  // Navigation between steps must NOT submit and must keep custom text.
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

/** Exact reference agentInviteProposal (simplified directions). */
export function agentInviteProposal(opts?: {
  recipientPartnerType?: string | null;
  offer?: "товары" | "услуги" | "товары или услуги";
}): string {
  if (opts?.recipientPartnerType === "AGENT") {
    return "Предлагаю обмениваться рекомендациями клиентов.";
  }
  const offer = opts?.offer ?? "товары или услуги";
  return `Предлагаю рекомендовать ваши ${offer} своим клиентам.`;
}

/**
 * Exact reference updateInviteTerms() composition for share / review preview.
 */
export function buildInviteConditionsText(
  state: InviteWizardSnapshot,
  opts?: { agentProposal?: string },
): string {
  const agent = state.agentOneWay;
  let partnerTerms = "";
  if (state.termsMode === "custom") {
    partnerTerms = [
      state.partnerAction.trim() ? `Моё предложение: ${state.partnerAction.trim()}` : "",
      state.partnerBenefit.trim() ? `Желаемые условия: ${state.partnerBenefit.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  } else {
    const terms = state.categories.filter(
      (c) => c.selected && c.storePercent != null,
    );
    partnerTerms = terms.length
      ? [
          "Хочу сотрудничать по вашим опубликованным условиям:",
          ...terms.map((c) => `${c.categoryLabel}: общий процент ${c.storePercent}%`),
          "Общий процент включает скидку клиенту и бонус агенту. Это не размер гарантированного вознаграждения.",
        ].join("\n")
      : "Прошу предложить условия сотрудничества.";
  }

  const mutualLine =
    "Предлагаю рекомендовать товары и услуги друг друга и привлекать новых клиентов, чтобы увеличивать продажи.";
  const agentLine =
    state.termsMode !== "custom"
      ? opts?.agentProposal?.trim() || agentInviteProposal()
      : "";

  return [
    !agent ? mutualLine : agentLine,
    partnerTerms,
    !agent
      ? state.ownTerms.trim()
        ? `Мои условия за рекомендации: ${state.ownTerms.trim()}`
        : "Мои условия за рекомендации предлагаю согласовать отдельно."
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Selected published numeric categories for POST terms payload (never invent %). */
export function selectedPublishedTermsForSubmit(state: InviteWizardSnapshot) {
  if (state.termsMode !== "published") return [];
  return state.categories.filter((c) => c.selected && c.storePercent != null);
}

/**
 * Persist note via existing `note` field.
 * - Empty/custom: message + full review conditions (no invented %).
 * - Published numeric in terms[]: note stays message-only unless the sender
 *   typed reciprocal ownTerms — then append that line only (do not duplicate
 *   the numeric DTO into note).
 */
export function buildInvitePersistNote(
  state: InviteWizardSnapshot,
  opts?: {
    agentProposal?: string;
    includeConditions: boolean;
    includeOwnTermsAlongsidePublished?: boolean;
  },
): string | null {
  const message = state.message.trim();
  if (opts?.includeConditions) {
    const conditions = buildInviteConditionsText(state, opts).trim();
    const parts = [message, conditions].filter(Boolean);
    return parts.length ? parts.join("\n\n") : null;
  }
  if (
    opts?.includeOwnTermsAlongsidePublished &&
    !state.agentOneWay &&
    state.ownTerms.trim()
  ) {
    const own = `Мои условия за рекомендации: ${state.ownTerms.trim()}`;
    const parts = [message, own].filter(Boolean);
    return parts.length ? parts.join("\n\n") : null;
  }
  return message || null;
}

/** Build share text for review step — exact message + separate conditions. */
export function buildInviteShareText(
  state: InviteWizardSnapshot,
  recipientPath: string,
  opts?: { agentProposal?: string },
): {
  message: string;
  conditions: string;
  path: string;
} {
  return {
    message: state.message.trim(),
    conditions: buildInviteConditionsText(state, opts),
    path: recipientPath,
  };
}
