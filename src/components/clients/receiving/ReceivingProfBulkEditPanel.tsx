"use client";

import { useEffect, useId, useRef } from "react";
import type { ReceivingBulkContractState } from "./ReceivingBulkActions";
import type { ReceivingBulkEditDraft, ReceivingProfBulkProfileDraft } from "./receiving-bulk-handoff";
import type { ReceivingPartnerSettings } from "@/lib/clients-parity/receiving-appeals-api";
import { receivingManualChannelOptions } from "@/lib/clients-parity/receiving-appeals-api";

type Props = {
  count: number;
  stageOptions: Array<{ id: string; label: string }>;
  stageBlocked: boolean;
  settings?: ReceivingPartnerSettings | null;
  contractState?: ReceivingBulkContractState;
  saveError?: string | null;
  onCancel: () => void;
  onApply: (draft: ReceivingBulkEditDraft) => void;
};

export function ReceivingProfBulkEditPanel({
  count,
  stageOptions,
  stageBlocked,
  settings,
  contractState = "blocked",
  saveError,
  onCancel,
  onApply,
}: Props) {
  const titleId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const channels = receivingManualChannelOptions(settings);

  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>("input,select,textarea")?.focus({ preventScroll: true });
  }, [count]);

  const applyDisabled = contractState === "blocked" || contractState === "pending" || contractState === "refresh-required";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (contractState !== "ready") return;
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const prof: ReceivingProfBulkProfileDraft = {
      appealTitle: String(fd.get("prof-appealTitle") ?? ""),
      clientDisplayName: String(fd.get("prof-clientDisplayName") ?? ""),
      requestText: String(fd.get("prof-requestText") ?? ""),
      clientCity: String(fd.get("prof-clientCity") ?? ""),
      clientContact: String(fd.get("prof-clientContact") ?? ""),
      budgetHint: String(fd.get("prof-budgetHint") ?? ""),
      erpDocumentNumber: String(fd.get("prof-erp") ?? ""),
      manualSourceKey: String(fd.get("prof-manualSource") ?? ""),
    };
    onApply({
      stageId: stageBlocked ? "" : String(fd.get("bulk-stage") ?? ""),
      serviceNote: String(fd.get("bulk-note") ?? "").trim(),
      appendNote: fd.get("bulk-note-append") === "on",
      prof,
    });
  };

  return (
    <form
      ref={formRef}
      className="panel stack ca-bulk-edit ca-bulk-edit-prof"
      data-ca-bulk-edit
      data-testid="ca-prof-bulk-edit"
      data-bulk-stage-blocked={stageBlocked ? "1" : "0"}
      data-contract-state={contractState}
      onSubmit={submit}
      aria-labelledby={titleId}
    >
      <h3 id={titleId}>Групповое изменение · {count}</h3>
      <p className="small muted">
        Пустое поле не меняется. Для каждой строки — свой PATCH с актуальной ревизией; возможен частичный
        результат.
      </p>
      {stageBlocked ? (
        <p className="notice" role="status">
          В выборке есть закрытые обращения — рабочий этап для всей группы изменить нельзя.
        </p>
      ) : (
        <p className="small muted">Нельзя массово ставить «Оплачено», «Отгружено» или «Возврат».</p>
      )}
      <fieldset className="stack">
        <legend className="small muted">CRM-поля (p149)</legend>
        <label className="field">
          Название обращения
          <input name="prof-appealTitle" data-testid="ca-bulk-prof-appealTitle" disabled={applyDisabled} />
        </label>
        <label className="field">
          Клиент
          <input name="prof-clientDisplayName" disabled={applyDisabled} />
        </label>
        <label className="field">
          Запрос
          <textarea name="prof-requestText" rows={2} disabled={applyDisabled} />
        </label>
        <div className="row">
          <label className="field">
            Город
            <input name="prof-clientCity" disabled={applyDisabled} />
          </label>
          <label className="field">
            Контакт
            <input name="prof-clientContact" disabled={applyDisabled} />
          </label>
        </div>
        <label className="field">
          Бюджет
          <input name="prof-budgetHint" disabled={applyDisabled} />
        </label>
        <label className="field">
          Номер в 1С
          <input name="prof-erp" disabled={applyDisabled} />
        </label>
        {channels.length > 0 ? (
          <label className="field">
            Источник (только MANUAL)
            <select name="prof-manualSource" defaultValue="" disabled={applyDisabled}>
              <option value="">Не менять</option>
              {channels.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="panel stack" data-testid="ca-bulk-responsible-readonly">
          <span className="small muted">Ответственный</span>
          <p className="muted small" style={{ margin: 0 }}>
            Массовое назначение недоступно: нет безопасного staff-read по филиалу. Меняйте только в карточке
            обращения (только просмотр текущего ответственного).
          </p>
        </div>
      </fieldset>
      <label className="field">
        Этап работ
        <select name="bulk-stage" defaultValue="" disabled={stageBlocked || applyDisabled}>
          <option value="">Не менять</option>
          {stageOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Служебная заметка
        <textarea name="bulk-note" rows={2} maxLength={2000} placeholder="Текст для команды" />
      </label>
      <label className="ca-check-line">
        <input type="checkbox" name="bulk-note-append" defaultChecked />
        Добавить к существующей заметке
      </label>
      {saveError ? (
        <p className="notice" role="alert">
          {saveError}
        </p>
      ) : null}
      <div className="ca-form-actions">
        <button type="button" className="btn ghost" data-ca-action="bulk:edit-cancel" onClick={onCancel}>
          Отмена
        </button>
        <button
          type="submit"
          className="btn primary"
          data-ca-action="bulk:edit-apply"
          disabled={applyDisabled}
          aria-disabled={applyDisabled}
        >
          {contractState === "pending" ? "Применение…" : contractState === "blocked" ? "Применить (недоступно)" : "Применить"}
        </button>
      </div>
    </form>
  );
}