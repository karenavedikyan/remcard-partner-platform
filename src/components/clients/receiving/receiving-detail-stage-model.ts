/**
 * Pure stage model for the receiving appeal card (prototype `renderDetailStepper`,
 * `renderNextStepCard`, `canTransitionTo`, `canRefuseFrom`) aligned with the server guards in
 * `canTransitionAppealStage`: the UI only offers what the server would accept.
 */

export const STAGE_NEW = "sys_new";
export const STAGE_PAID = "sys_paid";
export const STAGE_SHIPPED = "sys_shipped";
export const STAGE_RETURN = "sys_return";
export const STAGE_REFUSED = "sys_refused";

const SYSTEM_LABELS: Record<string, string> = {
  [STAGE_NEW]: "Новое обращение",
  [STAGE_PAID]: "Оплачено",
  [STAGE_SHIPPED]: "Отгружено",
  [STAGE_RETURN]: "Возврат",
  [STAGE_REFUSED]: "Отказ",
};

export type StageLike = { id: string; label: string };

function normalizeStageLabel(label: string): string {
  return label.trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
}

const SYSTEM_LABEL_TO_ID = new Map<string, string>(
  Object.entries(SYSTEM_LABELS).map(([id, label]) => [normalizeStageLabel(label), id]),
);

/**
 * System stage a custom stage is indistinguishable from by name (a stage the organisation named
 * «Новое обращение» must not render a second «Новое обращение» in the ribbon or a different badge).
 */
export function systemStageAliasOf(stageId: string, label?: string | null): string | null {
  if (SYSTEM_LABELS[stageId]) return null;
  const text = label?.trim();
  if (!text) return null;
  return SYSTEM_LABEL_TO_ID.get(normalizeStageLabel(text)) ?? null;
}

/** Stage whose ribbon / badge identity is the system one when a custom stage only repeats its name. */
export function effectiveStageId(stageId: string, workingStages: StageLike[], labelHint?: string | null): string {
  if (SYSTEM_LABELS[stageId]) return stageId;
  const label = workingStages.find((s) => s.id === stageId)?.label ?? labelHint;
  return systemStageAliasOf(stageId, label) ?? stageId;
}

/** Own stages that add something to the system path: no system ids, no repeats of a system caption, no duplicates. */
export function ownWorkingStages(workingStages: StageLike[]): StageLike[] {
  const seenIds = new Set<string>();
  const seenLabels = new Set<string>();
  const out: StageLike[] = [];
  for (const stage of workingStages) {
    const label = stage.label?.trim();
    if (!label || SYSTEM_LABELS[stage.id] || systemStageAliasOf(stage.id, label)) continue;
    const key = normalizeStageLabel(label);
    if (seenIds.has(stage.id) || seenLabels.has(key)) continue;
    seenIds.add(stage.id);
    seenLabels.add(key);
    out.push({ id: stage.id, label });
  }
  return out;
}

export type StageFacts = {
  stageId: string;
  /** A linked purchase order or a recorded payment time. */
  hasPurchase: boolean;
  shippedAt?: string | null;
};

export function systemStageLabel(stageId: string): string | null {
  return SYSTEM_LABELS[stageId] ?? null;
}

export function isTerminalStage(stageId: string): boolean {
  return stageId === STAGE_REFUSED || stageId === STAGE_RETURN;
}

export function appealHasPurchase(input: { purchaseOrderId?: string | null; paidAt?: string | null }): boolean {
  return Boolean(input.purchaseOrderId?.trim() || input.paidAt);
}

export type StageTransitionVerdict =
  | { ok: true }
  | { ok: false; code: "UNCHANGED" | "TERMINAL" | "REQUIRES_ORDER_PIPELINE" | "REQUIRES_PAID" | "REQUIRES_SHIPPED"; message: string };

/** Mirror of backend `canTransitionAppealStage` (no mutation, no settlement). */
export function canTransitionStage(facts: StageFacts, nextStageId: string): StageTransitionVerdict {
  if (nextStageId === facts.stageId) {
    return { ok: false, code: "UNCHANGED", message: "Этап уже установлен." };
  }
  if (facts.stageId === STAGE_REFUSED && nextStageId === STAGE_NEW) {
    return { ok: true };
  }
  if (isTerminalStage(facts.stageId) && !isTerminalStage(nextStageId)) {
    return { ok: false, code: "TERMINAL", message: "Обращение закрыто." };
  }
  if (nextStageId === STAGE_PAID) {
    return {
      ok: false,
      code: "REQUIRES_ORDER_PIPELINE",
      message: "Оплата отмечается при оформлении покупки в кошельке.",
    };
  }
  if (nextStageId === STAGE_SHIPPED && !facts.hasPurchase) {
    return { ok: false, code: "REQUIRES_PAID", message: "Сначала зафиксируйте оплату — покупка в кошельке." };
  }
  if (nextStageId === STAGE_RETURN && !facts.shippedAt) {
    return { ok: false, code: "REQUIRES_SHIPPED", message: "Сначала зафиксируйте отгрузку." };
  }
  return { ok: true };
}

export function stageDisplayLabel(
  stageId: string,
  workingStages: StageLike[],
  archivedStages: StageLike[] = [],
): string {
  return (
    systemStageLabel(stageId) ??
    workingStages.find((s) => s.id === stageId)?.label ??
    archivedStages.find((s) => s.id === stageId)?.label ??
    stageId
  );
}

/** `sys_new → working… → sys_paid → sys_shipped → sys_return` (prototype `pipelineFor`). */
export function stagePipeline(workingStages: StageLike[]): string[] {
  return [STAGE_NEW, ...ownWorkingStages(workingStages).map((s) => s.id), STAGE_PAID, STAGE_SHIPPED, STAGE_RETURN];
}

export type StepState = "done" | "current" | "upcoming" | "terminal";
export type StepperStep = { id: string; label: string; state: StepState };

function historyMentions(history: { text: string }[], label: string): boolean {
  const needle = label.trim().toLowerCase();
  if (!needle) return false;
  return history.some((h) => h.text.toLowerCase().includes(needle));
}

/**
 * Stage ribbon. A refusal or a return is a terminal event, not a step on a line: the ribbon then lists
 * only the steps the appeal really went through (working stages are confirmed from the history) and ends
 * with the terminal marker, never a fabricated linear path.
 */
export function buildStageStepper(input: {
  stageId: string;
  workingStages: StageLike[];
  archivedStages?: StageLike[];
  history?: { text: string }[];
}): StepperStep[] {
  const archived = input.archivedStages ?? [];
  const history = input.history ?? [];
  const own = ownWorkingStages(input.workingStages);
  const stageId = effectiveStageId(
    input.stageId,
    input.workingStages,
    archived.find((s) => s.id === input.stageId)?.label,
  );
  const label = (id: string) => stageDisplayLabel(id, own, archived);

  if (stageId === STAGE_REFUSED) {
    const visited = own.filter((s) => historyMentions(history, s.label));
    return [
      { id: STAGE_NEW, label: label(STAGE_NEW), state: "done" },
      ...visited.map((s) => ({ id: s.id, label: s.label, state: "done" as const })),
      { id: STAGE_REFUSED, label: label(STAGE_REFUSED), state: "terminal" },
    ];
  }

  if (stageId === STAGE_RETURN) {
    const visited = own.filter((s) => historyMentions(history, s.label));
    return [
      { id: STAGE_NEW, label: label(STAGE_NEW), state: "done" },
      ...visited.map((s) => ({ id: s.id, label: s.label, state: "done" as const })),
      { id: STAGE_PAID, label: label(STAGE_PAID), state: "done" },
      { id: STAGE_SHIPPED, label: label(STAGE_SHIPPED), state: "done" },
      { id: STAGE_RETURN, label: label(STAGE_RETURN), state: "terminal" },
    ];
  }

  const ids = stagePipeline(own);
  let curIdx = ids.indexOf(stageId);
  if (curIdx < 0) {
    // Archived custom stage that the appeal still sits in: keep it visible right after the entry point.
    ids.splice(1, 0, stageId);
    curIdx = 1;
  }
  return ids.map((id, i) => ({
    id,
    label: label(id),
    state: id === stageId ? "current" : i < curIdx ? "done" : "upcoming",
  }));
}

export type NextStepAction =
  | { kind: "stage"; stageId: string; label: string }
  | { kind: "pay"; label: string }
  | { kind: "ship"; label: string }
  | { kind: "return"; label: string };

export type NextStepModel =
  | { kind: "terminal"; title: string; reasonFallback: string }
  | {
      kind: "paid";
      title: string;
      primary: NextStepAction | null;
      blockedReason: string | null;
    }
  | {
      kind: "shipped";
      title: string;
      returnAction: NextStepAction | null;
      blockedReason: string | null;
    }
  | {
      kind: "work";
      title: string;
      primary: NextStepAction | null;
      canPay: boolean;
      canRefuse: boolean;
      pickOptions: StageLike[];
    };

/** Without own stages the next step after the entry point is the payment itself (existing payment flow). */
export const NEXT_STEP_PAYMENT_LABEL = "Оплата";

export function canRefuseFromStage(
  facts: StageFacts,
  workingStages: StageLike[],
): boolean {
  if (isTerminalStage(facts.stageId) || facts.hasPurchase) return false;
  const pipe = stagePipeline(workingStages);
  const idx = pipe.indexOf(facts.stageId);
  if (idx < 0) return true;
  return idx < pipe.indexOf(STAGE_PAID);
}

/** Stage options for «Выбрать другой этап»: only server-acceptable, non-financial-flow targets. */
export function stagePickOptions(facts: StageFacts, workingStages: StageLike[]): StageLike[] {
  return stagePipeline(workingStages)
    .filter((id) => id !== facts.stageId && canTransitionStage(facts, id).ok)
    .map((id) => ({ id, label: stageDisplayLabel(id, workingStages) }));
}

export function buildNextStepModel(
  rawFacts: StageFacts,
  workingStages: StageLike[],
  stageLabelHint?: string | null,
): NextStepModel {
  const facts: StageFacts = {
    ...rawFacts,
    stageId: effectiveStageId(rawFacts.stageId, workingStages, stageLabelHint),
  };
  const { stageId } = facts;
  if (isTerminalStage(stageId)) {
    return {
      kind: "terminal",
      title: systemStageLabel(stageId) ?? stageId,
      reasonFallback: stageId === STAGE_RETURN ? "Возврат оформлен" : "—",
    };
  }
  if (stageId === STAGE_SHIPPED) {
    const ret = canTransitionStage(facts, STAGE_RETURN);
    return {
      kind: "shipped",
      title: "Отгружено",
      returnAction: ret.ok ? { kind: "return", label: "Оформить возврат" } : null,
      blockedReason: ret.ok ? null : ret.message,
    };
  }
  if (stageId === STAGE_PAID) {
    const ship = canTransitionStage(facts, STAGE_SHIPPED);
    return {
      kind: "paid",
      title: "Оплачено · ждём отгрузку",
      primary: ship.ok ? { kind: "ship", label: "Отметить отгрузку" } : null,
      blockedReason: ship.ok ? null : ship.message,
    };
  }

  const pipe = stagePipeline(workingStages);
  const idx = pipe.indexOf(stageId);
  const nextId = idx >= 0 && idx < pipe.length - 1 ? pipe[idx + 1] : null;
  const nextLabel = nextId ? stageDisplayLabel(nextId, workingStages) : null;
  const titleLabel = nextId === STAGE_PAID ? NEXT_STEP_PAYMENT_LABEL : nextLabel;
  const canPay = !facts.hasPurchase;
  let primary: NextStepAction | null = null;
  if (nextId === STAGE_PAID) {
    primary = canPay ? { kind: "pay", label: "Отметить оплату" } : null;
  } else if (nextId && canTransitionStage(facts, nextId).ok) {
    primary = { kind: "stage", stageId: nextId, label: `Перевести в «${nextLabel}»` };
  }
  return {
    kind: "work",
    title: titleLabel ? `Следующий шаг: ${titleLabel}` : "Следующий шаг",
    primary,
    canPay: canPay && primary?.kind !== "pay",
    canRefuse: canRefuseFromStage(facts, workingStages),
    pickOptions: stagePickOptions(facts, workingStages),
  };
}
