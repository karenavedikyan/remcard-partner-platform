"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  buildProfProfilePatchBody,
  profProfilePatchHasFieldChanges,
  profRowSourceLabel,
  type ProfAppealDetailState,
  type ProfAppealProfilePatchBody,
  type ReceivingAppealExternalRefWire,
  type ReceivingAppealResponsibleWire,
  parseProfAppealDetailWire,
} from "@/lib/clients-parity/prof-appeals-adapter";
import {
  fetchReceivingAppealDetailWire,
  patchReceivingAppealProfileCas,
  receivingManualChannelOptions,
  type ReceivingPartnerSettings,
  type ReceivingReadScope,
} from "@/lib/clients-parity/receiving-appeals-api";
import { useCopyDisplayedValue } from "./useCopyDisplayedValue";

export type ReceivingAppealProfDrawerFormHandle = {
  save: () => Promise<void>;
  resetDraft: () => void;
  busy: boolean;
  saved: boolean;
};

export type AppealProfileSaveState = "idle" | "saved" | "unchanged" | "error";

export type ReceivingAppealProfDrawerFormProps = {
  detail: ProfAppealDetailState;
  settings?: ReceivingPartnerSettings | null;
  readScope?: ReceivingReadScope | null;
  onDetailChange?: (next: ProfAppealDetailState) => void;
  committedRevision?: number;
  onRevisionCommitted?: (revision: string | number) => void;
  onSaved?: () => void | Promise<void>;
  onBusyChange?: (busy: boolean) => void;
  onSaveStateChange?: (state: AppealProfileSaveState) => void;
  titleFocusRef?: RefObject<HTMLInputElement>;
};

type ProfileBaseline = ProfAppealProfilePatchBody & {
  originKind: "CERTIFICATE" | "MANUAL";
  externalRefs: ReceivingAppealExternalRefWire[];
  responsibleUserId: string | null;
};

type FormDraft = {
  appealTitle: string;
  clientDisplayName: string;
  requestText: string;
  clientCity: string;
  clientContact: string;
  budgetHint: string;
  privateNotes: string;
  erpDocumentNumber: string;
  manualSourceKey: string;
  responsibleUserId: string;
  externalRefs: ReceivingAppealExternalRefWire[];
};

export function responsibleSelectOptions(
  options: ReceivingAppealResponsibleWire[],
  current?: { userId?: string | null; displayLabel?: string | null } | null,
  emptyLabel = "Не назначен",
): Array<{ value: string; label: string }> {
  const items: Array<{ value: string; label: string }> = [{ value: "", label: emptyLabel }];
  const seen = new Set<string>();
  for (const opt of options) {
    const id = opt.userId.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    items.push({ value: id, label: opt.displayLabel.trim() || id });
  }
  const cur = current?.userId?.trim();
  const curLabel = current?.displayLabel?.trim();
  if (cur && !seen.has(cur)) {
    items.push({ value: cur, label: curLabel || "Текущий ответственный" });
  }
  return items;
}

function draftFromDetail(detail: ProfAppealDetailState): FormDraft {
  const a = detail.appeal;
  return {
    appealTitle: a.appealTitle?.trim() ?? "",
    clientDisplayName: a.clientDisplayName?.trim() ?? a.clientName?.trim() ?? "",
    requestText: a.requestText?.trim() ?? "",
    clientCity: a.clientCity?.trim() ?? "",
    clientContact: a.clientContact?.trim() ?? "",
    budgetHint: a.budgetHint?.trim() ?? "",
    privateNotes: a.privateNotes?.trim() ?? "",
    erpDocumentNumber: a.erpDocumentNumber?.trim() ?? "",
    manualSourceKey: a.manualSourceKey?.trim() ?? "",
    responsibleUserId: a.responsible?.userId?.trim() ?? "",
    externalRefs: a.externalRefs.map((ref) => ({ ...ref })),
  };
}

function baselineFromDetail(detail: ProfAppealDetailState): ProfileBaseline {
  return patchShapeFromDraft(detail, draftFromDetail(detail));
}

function patchShapeFromDraft(detail: ProfAppealDetailState, draft: FormDraft): ProfileBaseline {
  return {
    originKind: detail.appeal.originKind,
    expectedRevision: detail.revision,
    appealTitle: draft.appealTitle || null,
    clientDisplayName: draft.clientDisplayName || undefined,
    interest: draft.requestText || null,
    clientCity: draft.clientCity || null,
    clientContact: draft.clientContact || null,
    budgetHint: draft.budgetHint || null,
    privateNotes: draft.privateNotes || null,
    erpDocumentNumber: draft.erpDocumentNumber || null,
    manualSourceKey: draft.manualSourceKey || null,
    responsibleUserId: draft.responsibleUserId.trim() || null,
    externalRefs: draft.externalRefs,
  };
}

export const ReceivingAppealProfDrawerForm = forwardRef<
  ReceivingAppealProfDrawerFormHandle,
  ReceivingAppealProfDrawerFormProps
>(function ReceivingAppealProfDrawerForm(
  {
    detail,
    settings,
    readScope,
    onDetailChange,
    committedRevision,
    onRevisionCommitted,
    onSaved,
    onBusyChange,
    onSaveStateChange,
    titleFocusRef,
  },
  ref,
) {
  const readOnly = detail.detailReadOnly;
  const [draft, setDraft] = useState(() => draftFromDetail(detail));
  const [revision, setRevision] = useState(detail.revision);
  const baselineRef = useRef<ProfileBaseline>(baselineFromDetail(detail));
  const appliedDetailRef = useRef(detail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<AppealProfileSaveState>("idle");
  const { copy, copiedKey } = useCopyDisplayedValue();
  const localTitleRef = useRef<HTMLInputElement>(null);
  const appealTitleRef = titleFocusRef ?? localTitleRef;

  const shortId = detail.appeal.id.replace(/^appeal-/, "").slice(-4) || detail.appeal.id.slice(-4);

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    onSaveStateChange?.(saveState);
  }, [onSaveStateChange, saveState]);

  useEffect(() => {
    if (busy || appliedDetailRef.current === detail) return;
    appliedDetailRef.current = detail;
    setDraft(draftFromDetail(detail));
    setRevision(detail.revision);
    baselineRef.current = baselineFromDetail(detail);
    setSaveState("idle");
  }, [busy, detail]);

  const channels = useMemo(() => receivingManualChannelOptions(settings), [settings]);
  const isManual = detail.appeal.originKind === "MANUAL";
  const canPickResponsible = !readOnly && detail.responsibleOptions.length > 0;
  const responsibleOpts = useMemo(
    () =>
      responsibleSelectOptions(detail.responsibleOptions, {
        userId: draft.responsibleUserId || detail.appeal.responsible?.userId,
        displayLabel: detail.appeal.responsible?.displayLabel,
      }),
    [detail.responsibleOptions, detail.appeal.responsible, draft.responsibleUserId],
  );
  const sourceLabel =
    detail.appeal.manualSourceLabel?.trim() ||
    (isManual ? channels.find((c) => c.key === detail.appeal.manualSourceKey)?.label : null) ||
    (isManual ? "Не указан" : profRowSourceLabel(detail.appeal));

  const setField = <K extends keyof FormDraft>(key: K, value: FormDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSaveState("idle");
    setError(null);
  };

  const setExternalRefValue = (key: string, value: string) => {
    setDraft((prev) => ({
      ...prev,
      externalRefs: prev.externalRefs.map((r) => (r.key === key ? { ...r, value } : r)),
    }));
    setSaveState("idle");
    setError(null);
  };

  const saveProfile = useCallback(async () => {
    if (readOnly || busy) return;
    setError(null);
    const patchDraft = patchShapeFromDraft(detail, draft);
    const body = buildProfProfilePatchBody(baselineRef.current, patchDraft, Math.max(revision, committedRevision ?? 0));
    if (!profProfilePatchHasFieldChanges(body)) {
      setSaveState((state) => (state === "saved" ? state : "unchanged"));
      return;
    }
    setSaveState("idle");
    setBusy(true);
    const res = await patchReceivingAppealProfileCas(detail.appeal.id, body);
    if (!res.ok) {
      setBusy(false);
      setError(res.message);
      setSaveState("error");
      return;
    }
    if (res.revision != null) onRevisionCommitted?.(res.revision);
    const scopeAll = readScope?.branchScope === "all";
    const refreshed = await fetchReceivingAppealDetailWire(detail.appeal.id, readScope ?? undefined);
    let nextDetail: ProfAppealDetailState | null = null;
    if (refreshed.ok) {
      nextDetail = parseProfAppealDetailWire(refreshed.wire, { scopeAll });
    }
    if (nextDetail) {
      appliedDetailRef.current = nextDetail;
      setRevision(nextDetail.revision);
      baselineRef.current = baselineFromDetail(nextDetail);
      setDraft(draftFromDetail(nextDetail));
      onDetailChange?.(nextDetail);
    } else if (res.revision != null) {
      const parsedRevision =
        typeof res.revision === "number" ? res.revision : Number(res.revision) || revision;
      setRevision(parsedRevision);
      baselineRef.current = {
        ...baselineRef.current,
        ...patchDraft,
        expectedRevision: parsedRevision,
      };
      const detailWithRevision = { ...detail, revision: parsedRevision };
      appliedDetailRef.current = detailWithRevision;
      onDetailChange?.(detailWithRevision);
    }
    setBusy(false);
    setSaveState("saved");
    await onSaved?.();
  }, [busy, committedRevision, detail, draft, onDetailChange, onRevisionCommitted, onSaved, readOnly, readScope, revision]);

  useImperativeHandle(
    ref,
    () => ({
      save: () => saveProfile(),
      resetDraft: () => {
        setDraft(draftFromDetail(detail));
        setSaveState("idle");
        setError(null);
      },
      busy,
      saved: saveState === "saved",
    }),
    [busy, detail, saveState, saveProfile],
  );

  const fieldsDisabled = readOnly || busy;
  const responsibleLabel = detail.appeal.responsible?.displayLabel?.trim() || "Не назначен";

  return (
    <fieldset className="prof-drawer-form edit-fields" disabled={fieldsDisabled} data-testid="ca-prof-drawer-form">
      <legend className="sr-only">Профиль обращения</legend>
      <label className="field">
        <span>Название обращения</span>
        <input
          ref={appealTitleRef}
          value={draft.appealTitle}
          readOnly={readOnly}
          maxLength={120}
          data-testid="ca-prof-field-appealTitle"
          onChange={(e) => setField("appealTitle", e.target.value)}
        />
      </label>
      <label className="field">
        <span>Запрос</span>
        <textarea
          rows={2}
          value={draft.requestText}
          readOnly={readOnly}
          maxLength={200}
          placeholder="Например, двери и замер"
          data-testid="ca-prof-field-requestText"
          onChange={(e) => setField("requestText", e.target.value)}
        />
      </label>
      {isManual && !readOnly && channels.length > 0 ? (
        <label className="field">
          <span>Источник обращения</span>
          <select
            value={draft.manualSourceKey || ""}
            data-testid="ca-prof-field-manual-source"
            onChange={(e) => setField("manualSourceKey", e.target.value)}
          >
            <option value="">Не указан</option>
            {channels.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <small className="source-note">Обращение внесено вручную</small>
        </label>
      ) : (
        <div className="source-readonly" data-testid="ca-prof-field-source-readonly">
          <span>Источник обращения</span>
          <strong>{sourceLabel}</strong>
          {isManual ? null : <small className="source-note">Определён автоматически</small>}
        </div>
      )}
      <div className="field-grid">
        <label className="field">
          <span>Имя клиента</span>
          <input
            value={draft.clientDisplayName}
            readOnly={readOnly}
            maxLength={120}
            data-testid="ca-prof-field-clientDisplayName"
            onChange={(e) => setField("clientDisplayName", e.target.value)}
          />
        </label>
        {canPickResponsible ? (
          <label className="field">
            <span>Ответственный</span>
            <select
              value={draft.responsibleUserId}
              data-testid="ca-prof-field-responsible-select"
              onChange={(e) => setField("responsibleUserId", e.target.value)}
            >
              {responsibleOpts.map((o) => (
                <option key={o.value || "none"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="source-readonly" data-testid="ca-prof-field-responsible-readonly">
            <span>Ответственный</span>
            <strong>{responsibleLabel}</strong>
          </div>
        )}
        <label className="field">
          <span>Город</span>
          <input
            value={draft.clientCity}
            readOnly={readOnly}
            maxLength={70}
            data-testid="ca-prof-field-clientCity"
            onChange={(e) => setField("clientCity", e.target.value)}
          />
        </label>
        <label className="field">
          <span>Контакт</span>
          <input
            value={draft.clientContact}
            readOnly={readOnly}
            maxLength={80}
            data-testid="ca-prof-field-clientContact"
            onChange={(e) => setField("clientContact", e.target.value)}
          />
        </label>
        <label className="field prof-field-span">
          <span>Бюджет</span>
          <input
            value={draft.budgetHint}
            readOnly={readOnly}
            data-testid="ca-prof-field-budgetHint"
            onChange={(e) => setField("budgetHint", e.target.value)}
          />
        </label>
      </div>
      <label className="field">
        <span>Внутренняя заметка</span>
        <textarea
          rows={2}
          value={draft.privateNotes}
          readOnly={readOnly}
          maxLength={500}
          placeholder="Только для вашей команды"
          data-testid="ca-prof-field-privateNotes"
          onChange={(e) => setField("privateNotes", e.target.value)}
        />
      </label>

      <section className="custom-fields" data-testid="ca-prof-partner-fields" aria-label="Поля партнёра">
        <strong>Поля партнёра</strong>
        <div className="field-grid">
          <label className="field prof-copy-row">
            <span>Номер заказа в 1С</span>
            <span className="prof-copy-input-wrap">
              <input
                value={draft.erpDocumentNumber}
                readOnly={readOnly}
                data-testid="ca-prof-field-erp"
                onChange={(e) => setField("erpDocumentNumber", e.target.value)}
              />
              <CopyIconButton
                disabled={!draft.erpDocumentNumber.trim()}
                copied={copiedKey === "erp"}
                caption="Номер заказа в 1С"
                onCopy={() => void copy("erp", draft.erpDocumentNumber)}
                testId="ca-prof-copy-erp"
              />
            </span>
          </label>
          {draft.externalRefs.map((ref) => (
            <label key={ref.key} className="field prof-copy-row">
              <span>{ref.label}</span>
              <span className="prof-copy-input-wrap">
                <input
                  value={ref.value ?? ""}
                  readOnly={readOnly}
                  data-testid={`ca-prof-external-${ref.key}`}
                  onChange={(e) => setExternalRefValue(ref.key, e.target.value)}
                />
                <CopyIconButton
                  disabled={!ref.value?.trim()}
                  copied={copiedKey === `ext-${ref.key}`}
                  caption={ref.label}
                  onCopy={() => void copy(`ext-${ref.key}`, ref.value ?? "")}
                  testId={`ca-prof-copy-external-${ref.key}`}
                />
              </span>
            </label>
          ))}
        </div>
        <p className="help" data-testid="ca-prof-partner-help">
          Эти номера не заменяют № {shortId} в RemCard.
        </p>
      </section>

      {error ? (
        <p className="notice accent" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
});

function CopyIconButton({
  caption,
  copied,
  disabled,
  onCopy,
  testId,
}: {
  caption: string;
  copied: boolean;
  disabled?: boolean;
  onCopy: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      className="btn ghost icon copy-btn number-copy"
      aria-label={copied ? "Скопировано" : `Скопировать: ${caption}`}
      disabled={disabled}
      data-testid={testId}
      onClick={onCopy}
    >
      <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15V6a2 2 0 0 1 2-2h9" />
      </svg>
    </button>
  );
}
