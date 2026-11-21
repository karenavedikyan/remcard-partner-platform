"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  buildProfProfilePatchBody,
  profProfilePatchHasFieldChanges,
  type ProfAppealDetailState,
  type ProfAppealProfilePatchBody,
  type ReceivingAppealExternalRefWire,
  parseProfAppealDetailWire,
} from "@/lib/clients-parity/prof-appeals-adapter";
import {
  fetchReceivingAppealDetailWire,
  patchReceivingAppealProfileCas,
  receivingManualChannelOptions,
  type ReceivingPartnerSettings,
  type ReceivingReadScope,
} from "@/lib/clients-parity/receiving-appeals-api";

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
  erpDocumentNumber: string;
  manualSourceKey: string;
  externalRefs: ReceivingAppealExternalRefWire[];
};

function draftFromDetail(detail: ProfAppealDetailState): FormDraft {
  const a = detail.appeal;
  return {
    appealTitle: a.appealTitle?.trim() ?? "",
    clientDisplayName: a.clientDisplayName?.trim() ?? a.clientName?.trim() ?? "",
    requestText: a.requestText?.trim() ?? "",
    clientCity: a.clientCity?.trim() ?? "",
    clientContact: a.clientContact?.trim() ?? "",
    budgetHint: a.budgetHint?.trim() ?? "",
    erpDocumentNumber: a.erpDocumentNumber?.trim() ?? "",
    manualSourceKey: a.manualSourceKey?.trim() ?? "",
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
    erpDocumentNumber: draft.erpDocumentNumber || null,
    manualSourceKey: draft.manualSourceKey || null,
    responsibleUserId: detail.appeal.responsible?.userId?.trim() || null,
    externalRefs: draft.externalRefs,
  };
}

function draftToPatchShape(
  detail: ProfAppealDetailState,
  draft: FormDraft,
): ProfileBaseline {
  const base = baselineFromDetail(detail);
  return {
    ...base,
    appealTitle: draft.appealTitle || null,
    clientDisplayName: draft.clientDisplayName || undefined,
    interest: draft.requestText || null,
    clientCity: draft.clientCity || null,
    clientContact: draft.clientContact || null,
    budgetHint: draft.budgetHint || null,
    erpDocumentNumber: draft.erpDocumentNumber || null,
    manualSourceKey: draft.manualSourceKey || null,
    responsibleUserId: detail.appeal.responsible?.userId?.trim() || null,
    externalRefs: draft.externalRefs,
  };
}

export const ReceivingAppealProfDrawerForm = forwardRef<
  ReceivingAppealProfDrawerFormHandle,
  ReceivingAppealProfDrawerFormProps
>(function ReceivingAppealProfDrawerForm(
  { detail, settings, readScope, onDetailChange, onSaved, onBusyChange, onSaveStateChange },
  ref,
) {
  const readOnly = detail.detailReadOnly;
  const [draft, setDraft] = useState(() => draftFromDetail(detail));
  const [revision, setRevision] = useState(detail.revision);
  const baselineRef = useRef<ProfileBaseline>(baselineFromDetail(detail));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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
  const certPromo = detail.appeal.certificatePromoCode?.trim();

  const setField = <K extends keyof FormDraft>(key: K, value: FormDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const setExternalRefValue = (key: string, value: string) => {
    setDraft((prev) => ({
      ...prev,
      externalRefs: prev.externalRefs.map((ref) => (ref.key === key ? { ...ref, value } : ref)),
    }));
    setSaved(false);
  };

  const saveProfile = useCallback(async () => {
    if (readOnly || busy) return;
    setBusy(true);
    setError(null);
    const patchDraft = draftToPatchShape(detail, draft);
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

  return (
    <fieldset className="prof-drawer-form stack" disabled={fieldsDisabled} data-testid="ca-prof-drawer-form">
      {readOnly ? (
        <p className="notice small" data-testid="ca-prof-drawer-readonly">
          Только просмотр: изменения профиля недоступны.
        </p>
      ) : null}
      <label className="field">
        Название обращения
        <input
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
      <label className="field">
        Запрос
        <textarea
          rows={3}
          value={draft.requestText}
          readOnly={readOnly}
          data-testid="ca-prof-field-requestText"
          onChange={(e) => setField("requestText", e.target.value)}
        />
      </label>
      <div className="row">
        <label className="field">
          Город
          <input value={draft.clientCity} readOnly={readOnly} onChange={(e) => setField("clientCity", e.target.value)} />
        </label>
        <label className="field">
          Контакт
          <input
            value={draft.clientContact}
            readOnly={readOnly}
            onChange={(e) => setField("clientContact", e.target.value)}
          />
        </label>
      </div>
      <label className="field">
        Бюджет
        <input value={draft.budgetHint} readOnly={readOnly} onChange={(e) => setField("budgetHint", e.target.value)} />
      </label>
      <label className="field">
        Номер в 1С
        <input
          value={draft.erpDocumentNumber}
          readOnly={readOnly}
          data-testid="ca-prof-field-erp"
          onChange={(e) => setField("erpDocumentNumber", e.target.value)}
        />
      </label>
      {certPromo ? (
        <div className="panel stack" data-testid="ca-prof-certificate-promo">
          <span className="muted small">Номер сертификата</span>
          <strong>{certPromo}</strong>
        </div>
      ) : null}
      <div className="panel stack" data-testid="ca-prof-field-responsible">
        <span className="small muted">Ответственный</span>
        <strong>{detail.appeal.responsible?.displayLabel?.trim() || "Не назначен"}</strong>
        <p className="muted small" style={{ margin: 0 }}>
          Справочник сотрудников по филиалу в этом интерфейсе недоступен — смена ответственного через отдельный
          staff-read не подключалась.
        </p>
      </div>
      {isManual && channels.length > 0 ? (
        <label className="field">
          Источник
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
        </label>
      ) : null}
      {draft.externalRefs.length > 0 ? (
        <section className="panel stack" data-testid="ca-prof-external-refs">
          <h3 className="small muted">Внешние поля</h3>
          {draft.externalRefs.map((ref) => (
            <label key={ref.key} className="field">
              {ref.label}
              <input
                value={ref.value ?? ""}
                readOnly={readOnly}
                data-testid={`ca-prof-external-${ref.key}`}
                onChange={(e) => setExternalRefValue(ref.key, e.target.value)}
              />
            </label>
          ))}
        </section>
      ) : null}
      {error ? (
        <p className="notice accent" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
});