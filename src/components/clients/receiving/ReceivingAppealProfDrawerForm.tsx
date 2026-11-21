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

export type ReceivingAppealProfDrawerFormProps = {
  detail: ProfAppealDetailState;
  settings?: ReceivingPartnerSettings | null;
  readScope?: ReceivingReadScope | null;
  onDetailChange?: (next: ProfAppealDetailState) => void;
  onSaved?: () => void | Promise<void>;
  onBusyChange?: (busy: boolean) => void;
  onSaveStateChange?: (saved: boolean) => void;
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
  const draft = draftFromDetail(detail);
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
    responsibleUserId: draft.responsibleUserId || null,
    externalRefs: draft.externalRefs,
  };
}

function patchShapeFromDraft(detail: ProfAppealDetailState, draft: FormDraft): ProfileBaseline {
  const base = baselineFromDetail(detail);
  return {
    ...base,
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const { copy, copiedKey } = useCopyDisplayedValue();
  const localTitleRef = useRef<HTMLInputElement>(null);
  const appealTitleRef = titleFocusRef ?? localTitleRef;

  const shortId = detail.appeal.id.replace(/^appeal-/, "").slice(-4) || detail.appeal.id.slice(-4);

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    onSaveStateChange?.(saved);
  }, [onSaveStateChange, saved]);

  useEffect(() => {
    if (busy) return;
    const nextDraft = draftFromDetail(detail);
    const nextBaseline = baselineFromDetail(detail);
    setDraft(nextDraft);
    setRevision(detail.revision);
    baselineRef.current = nextBaseline;
    setSaved(false);
  }, [busy, detail]);

  const channels = useMemo(() => receivingManualChannelOptions(settings), [settings]);
  const isManual = detail.appeal.originKind === "MANUAL";
  const responsibleOpts = useMemo(
    () =>
      responsibleSelectOptions(detail.responsibleOptions, {
        userId: draft.responsibleUserId || detail.appeal.responsible?.userId,
        displayLabel: detail.appeal.responsible?.displayLabel,
      }),
    [detail.responsibleOptions, draft.responsibleUserId],
  );
  const sourceReadonlyLabel = useMemo(() => profRowSourceLabel(detail.appeal), [detail.appeal]);

  const setField = <K extends keyof FormDraft>(key: K, value: FormDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const setExternalRefValue = (key: string, value: string) => {
    setDraft((prev) => ({
      ...prev,
      externalRefs: prev.externalRefs.map((r) => (r.key === key ? { ...r, value } : r)),
    }));
    setSaved(false);
  };

  const saveProfile = useCallback(async () => {
    if (readOnly || busy) return;
    setBusy(true);
    setError(null);
    const patchDraft = patchShapeFromDraft(detail, draft);
    const body = buildProfProfilePatchBody(baselineRef.current, patchDraft, revision);
    if (!profProfilePatchHasFieldChanges(body)) {
      setBusy(false);
      setSaved(true);
      return;
    }
    const res = await patchReceivingAppealProfileCas(detail.appeal.id, body);
    if (!res.ok) {
      setBusy(false);
      setError(res.message);
      return;
    }
    const scopeAll = readScope?.branchScope === "all";
    const refreshed = await fetchReceivingAppealDetailWire(detail.appeal.id, readScope ?? undefined);
    let nextDetail: ProfAppealDetailState | null = null;
    if (refreshed.ok) {
      nextDetail = parseProfAppealDetailWire(refreshed.wire, { scopeAll });
    }
    if (nextDetail) {
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
      onDetailChange?.({ ...detail, revision: parsedRevision });
    }
    setBusy(false);
    setSaved(true);
    await onSaved?.();
  }, [busy, detail, draft, onDetailChange, onSaved, readOnly, readScope, revision]);

  useImperativeHandle(
    ref,
    () => ({
      save: () => saveProfile(),
      resetDraft: () => {
        setDraft(draftFromDetail(detail));
        setSaved(false);
      },
      busy,
      saved,
    }),
    [busy, detail, saved, saveProfile],
  );

  const fieldsDisabled = readOnly || busy;
  const showResponsibleSelect = !readOnly && detail.responsibleOptions.length > 0;

  return (
    <fieldset className="prof-drawer-form stack" disabled={fieldsDisabled} data-testid="ca-prof-drawer-form">
      {readOnly ? (
        <p className="notice small" data-testid="ca-prof-drawer-readonly">
          Только просмотр: изменения профиля недоступны.
        </p>
      ) : null}

      <div className="prof-field-grid" data-testid="ca-prof-main-fields">
        <label className="field prof-field-span">
          Название обращения
          <input
            ref={appealTitleRef}
            value={draft.appealTitle}
            readOnly={readOnly}
            data-testid="ca-prof-field-appealTitle"
            onChange={(e) => setField("appealTitle", e.target.value)}
          />
        </label>
        <label className="field">
          Клиент
          <input
            value={draft.clientDisplayName}
            readOnly={readOnly}
            data-testid="ca-prof-field-clientDisplayName"
            onChange={(e) => setField("clientDisplayName", e.target.value)}
          />
        </label>
        <label className="field prof-field-span">
          Запрос
          <textarea
            rows={3}
            value={draft.requestText}
            readOnly={readOnly}
            data-testid="ca-prof-field-requestText"
            onChange={(e) => setField("requestText", e.target.value)}
          />
        </label>
        <label className="field">
          Город
          <input
            value={draft.clientCity}
            readOnly={readOnly}
            data-testid="ca-prof-field-clientCity"
            onChange={(e) => setField("clientCity", e.target.value)}
          />
        </label>
        <label className="field">
          Контакт
          <input
            value={draft.clientContact}
            readOnly={readOnly}
            data-testid="ca-prof-field-clientContact"
            onChange={(e) => setField("clientContact", e.target.value)}
          />
        </label>
        <label className="field prof-field-span">
          Бюджет
          <input
            value={draft.budgetHint}
            readOnly={readOnly}
            data-testid="ca-prof-field-budgetHint"
            onChange={(e) => setField("budgetHint", e.target.value)}
          />
        </label>
        <label className="field prof-field-span">
          Заметки команды
          <textarea
            rows={3}
            value={draft.privateNotes}
            readOnly={readOnly}
            data-testid="ca-prof-field-privateNotes"
            onChange={(e) => setField("privateNotes", e.target.value)}
          />
        </label>
        <label className="field">
          Источник
          {isManual && channels.length > 0 && !readOnly ? (
            <select
              value={draft.manualSourceKey || ""}
              disabled={readOnly}
              data-testid="ca-prof-field-manual-source"
              onChange={(e) => setField("manualSourceKey", e.target.value)}
            >
              <option value="">—</option>
              {channels.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          ) : (
            <input readOnly value={sourceReadonlyLabel} data-testid="ca-prof-field-source-readonly" />
          )}
        </label>
        <label className="field" data-testid="ca-prof-field-responsible">
          Ответственный
          {showResponsibleSelect ? (
            <select
              value={draft.responsibleUserId}
              data-testid="ca-prof-field-responsible-select"
              onChange={(e) => setField("responsibleUserId", e.target.value)}
            >
              {responsibleOpts.map((opt) => (
                <option key={opt.value || "empty"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              readOnly
              value={detail.appeal.responsible?.displayLabel?.trim() || "Не назначен"}
              data-testid="ca-prof-field-responsible-readonly"
            />
          )}
        </label>
      </div>

      <section className="prof-partner-section stack" data-testid="ca-prof-partner-fields">
        <h3 className="prof-section-title">Поля партнёра</h3>
        <p className="muted small prof-partner-help">
          Эти номера не заменяют № {shortId} в RemCard.
        </p>
        <div className="prof-field-grid">
          <label className="field">
            Номер в 1С
            <div className="prof-copy-field">
              <input
                value={draft.erpDocumentNumber}
                readOnly={readOnly}
                data-testid="ca-prof-field-erp"
                onChange={(e) => setField("erpDocumentNumber", e.target.value)}
              />
              <button
                type="button"
                className="btn ghost small-btn"
                disabled={!draft.erpDocumentNumber.trim()}
                data-testid="ca-prof-copy-erp"
                onClick={() => void copy("erp", draft.erpDocumentNumber)}
              >
                {copiedKey === "erp" ? "Скопировано" : "Копировать"}
              </button>
            </div>
          </label>
          {draft.externalRefs.map((ref) => (
            <label key={ref.key} className="field">
              {ref.label}
              <div className="prof-copy-field">
                <input
                  value={ref.value ?? ""}
                  readOnly={readOnly}
                  data-testid={`ca-prof-external-${ref.key}`}
                  onChange={(e) => setExternalRefValue(ref.key, e.target.value)}
                />
                <button
                  type="button"
                  className="btn ghost small-btn"
                  disabled={!ref.value?.trim()}
                  data-testid={`ca-prof-copy-external-${ref.key}`}
                  onClick={() => void copy(`ext-${ref.key}`, ref.value ?? "")}
                >
                  {copiedKey === `ext-${ref.key}` ? "Скопировано" : "Копировать"}
                </button>
              </div>
            </label>
          ))}
        </div>
      </section>

      {error ? (
        <p className="notice accent" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
});