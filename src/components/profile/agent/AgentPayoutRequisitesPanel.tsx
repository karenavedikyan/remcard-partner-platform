"use client";

import { FormEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import {
  createAgentRequisites,
  fetchAgentRequisites,
  listAgentRequisites,
  patchAgentRequisites,
} from "@/lib/agent-profile/api";
import type { AgentRequisitesItem } from "@/lib/agent-profile/types";
import styles from "./AgentProfileWizard.module.css";

const KIND_LABELS: Record<string, string> = {
  person: "Физическое лицо",
  ip: "ИП",
  company: "Юридическое лицо",
};

type AgentPayoutRequisitesPanelProps = {
  disabled?: boolean;
};

type FormState = {
  kind: "person" | "ip" | "company";
  label: string;
  legalName: string;
  inn: string;
  kpp: string;
  bankName: string;
  bik: string;
  accountNumber: string;
  corrAccount: string;
};

const emptyForm = (): FormState => ({
  kind: "person",
  label: "",
  legalName: "",
  inn: "",
  kpp: "",
  bankName: "",
  bik: "",
  accountNumber: "",
  corrAccount: "",
});

export function AgentPayoutRequisitesPanel({ disabled }: AgentPayoutRequisitesPanelProps) {
  const [items, setItems] = useState<AgentRequisitesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailById, setDetailById] = useState<Record<string, AgentRequisitesItem>>({});
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const copyFallbackRef = useRef<HTMLTextAreaElement>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editExpectedVersion, setEditExpectedVersion] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const dialogTitleId = useId();
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listAgentRequisites();
      setItems(data.items ?? []);
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить реквизиты");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!formOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFormOpen(false);
        restoreFocusRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formOpen]);

  const ensureFullDetail = useCallback(
    async (id: string): Promise<AgentRequisitesItem | null> => {
      const cached = detailById[id];
      if (cached?.accountNumber != null || cached?.corrAccount != null) {
        return cached;
      }
      setDetailLoadingId(id);
      try {
        const data = await fetchAgentRequisites(id);
        const item = data.item;
        setDetailById((prev) => ({ ...prev, [id]: item }));
        return item;
      } catch (caught) {
        setError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить реквизиты");
        return null;
      } finally {
        setDetailLoadingId((cur) => (cur === id ? null : cur));
      }
    },
    [detailById],
  );

  const mergeListWithDetail = (item: AgentRequisitesItem): AgentRequisitesItem =>
    detailById[item.id] ? { ...item, ...detailById[item.id] } : item;

  const openCreate = (trigger: HTMLElement | null) => {
    restoreFocusRef.current = trigger;
    setEditId(null);
    setEditExpectedVersion(null);
    setForm(emptyForm());
    setFieldErrors({});
    setFormOpen(true);
  };

  const openEdit = async (id: string, trigger: HTMLElement | null) => {
    restoreFocusRef.current = trigger;
    setPendingId(id);
    setError("");
    try {
      const item = (await ensureFullDetail(id)) ?? (await fetchAgentRequisites(id)).item;
      setEditId(id);
      setEditExpectedVersion(item.version);
      setForm({
        kind: (item.kind as FormState["kind"]) || "person",
        label: item.label ?? "",
        legalName: item.legalName ?? "",
        inn: item.inn ?? "",
        kpp: item.kpp ?? "",
        bankName: item.bankName ?? "",
        bik: item.bik ?? "",
        accountNumber: item.accountNumber ?? "",
        corrAccount: item.corrAccount ?? "",
      });
      setFieldErrors({});
      setFormOpen(true);
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось открыть реквизиты");
    } finally {
      setPendingId(null);
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (disabled || pendingId === "form") return;
    setPendingId("form");
    setFieldErrors({});
    setError("");
    try {
      if (editId) {
        const body: Record<string, unknown> = {
          action: "revise",
          ...form,
          label: form.label.trim() || null,
        };
        if (editExpectedVersion != null) {
          body.expectedVersion = editExpectedVersion;
        }
        await patchAgentRequisites(editId, body);
      } else {
        await createAgentRequisites({
          ...form,
          label: form.label.trim() || undefined,
          isPrimary: items.length === 0,
        });
      }
      setFormOpen(false);
      restoreFocusRef.current?.focus();
      setDetailById({});
      setExpandedId(null);
      await reload();
    } catch (caught) {
      if (caught instanceof RemcardApiError && caught.body?.fields) {
        setFieldErrors(caught.body.fields as Partial<Record<keyof FormState, string>>);
      } else {
        setError(caught instanceof RemcardApiError ? caught.message : "Ошибка сохранения");
      }
    } finally {
      setPendingId(null);
    }
  };

  const runAction = async (id: string, action: "setPrimary" | "applyForNextPayout" | "archive") => {
    if (disabled || pendingId) return;
    if (action === "archive" && !window.confirm("Архивировать этот набор? Он не будет доступен для нового выбора.")) {
      return;
    }
    setPendingId(id);
    setError("");
    try {
      await patchAgentRequisites(id, { action });
      setDetailById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (expandedId === id) setExpandedId(null);
      await reload();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось выполнить действие");
    } finally {
      setPendingId(null);
    }
  };

  const formatCopyText = (item: AgentRequisitesItem) => {
    const lines: string[] = [];
    if (item.label?.trim()) lines.push(`Название: ${item.label.trim()}`);
    lines.push(item.legalName);
    lines.push(KIND_LABELS[item.kind] ?? item.kind);
    if (item.inn) lines.push(`ИНН ${item.inn}`);
    if (item.kpp) lines.push(`КПП ${item.kpp}`);
    if (item.bankName) lines.push(item.bankName);
    if (item.bik) lines.push(`БИК ${item.bik}`);
    const account = item.accountNumber ?? item.accountNumberMasked;
    if (account) lines.push(`Р/с ${account}`);
    const corr = item.corrAccount ?? item.corrAccountMasked;
    if (corr) lines.push(`К/с ${corr}`);
    return lines.join("\n");
  };

  const copyItem = async (item: AgentRequisitesItem) => {
    const full = (await ensureFullDetail(item.id)) ?? mergeListWithDetail(item);
    const text = formatCopyText(full);
    setCopyStatus("");
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Скопировано в буфер обмена");
    } catch {
      if (copyFallbackRef.current) {
        copyFallbackRef.current.hidden = false;
        copyFallbackRef.current.value = text;
        copyFallbackRef.current.select();
        setCopyStatus("Скопируйте текст вручную из поля ниже");
      } else {
        setCopyStatus("Не удалось скопировать автоматически");
      }
    }
  };

  const toggleExpanded = async (item: AgentRequisitesItem) => {
    if (expandedId === item.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(item.id);
    await ensureFullDetail(item.id);
  };

  return (
    <section className={`${styles.card} ${styles.bankPanel}`} data-testid="bank-panel">
      <div className={styles.cardTop}>
        <h2 className={styles.title}>Реквизиты для получения оплаты</h2>
        <span className={styles.optionalMark}>Необязательно</span>
      </div>
      <p className={styles.intro}>
        Добавьте банковский счёт для безналичных выплат. Это не требуется для сохранения профиля.
      </p>
      {error ? <p className={styles.bannerError}>{error}</p> : null}
      {loading ? <p className={styles.intro}>Загрузка…</p> : null}
      {!loading && items.length === 0 && !formOpen ? (
        <p className={styles.intro}>
          Пока нет сохранённых реквизитов. Добавьте счёт, когда будете готовы получать оплату.
        </p>
      ) : null}
      <ul className={styles.requisitesList}>
        {items.map((item) => {
          const display = mergeListWithDetail(item);
          const loadingDetail = detailLoadingId === item.id;
          return (
          <li key={item.id} className={styles.bankCard}>
            <div className={styles.bankCardHead}>
              <strong>{item.label?.trim() || item.legalName}</strong>
              {item.isPrimary ? <span className={styles.status}>Основные</span> : null}
            </div>
            <small>
              {KIND_LABELS[item.kind] ?? item.kind}
              {item.inn ? ` · ИНН ${item.inn}` : ""}
              {item.bankName ? ` · ${item.bankName}` : ""}
              {item.accountNumberMasked ? ` · ${item.accountNumberMasked}` : ""}
            </small>
            {expandedId === item.id ? (
              loadingDetail ? (
                <p className={styles.intro}>Загрузка полных реквизитов…</p>
              ) : (
              <dl className={styles.facts}>
                {display.label?.trim() ? (
                  <div>
                    <dt>Название</dt>
                    <dd>{display.label.trim()}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Получатель</dt>
                  <dd>{display.legalName}</dd>
                </div>
                {display.kpp ? (
                  <div>
                    <dt>КПП</dt>
                    <dd>{display.kpp}</dd>
                  </div>
                ) : null}
                {display.bik ? (
                  <div>
                    <dt>БИК</dt>
                    <dd>{display.bik}</dd>
                  </div>
                ) : null}
                {display.accountNumber ? (
                  <div>
                    <dt>Расчётный счёт</dt>
                    <dd>{display.accountNumber}</dd>
                  </div>
                ) : null}
                {display.corrAccount ? (
                  <div>
                    <dt>Корр. счёт</dt>
                    <dd>{display.corrAccount}</dd>
                  </div>
                ) : null}
              </dl>
              )
            ) : null}
            <div className={styles.requisitesItemActions}>
              <button
                type="button"
                className={styles.btn}
                disabled={disabled || pendingId === item.id || loadingDetail}
                onClick={() => void toggleExpanded(item)}
              >
                {expandedId === item.id ? "Скрыть" : "Посмотреть"}
              </button>
              <button
                type="button"
                className={styles.btn}
                disabled={disabled || pendingId === item.id}
                onClick={() => void copyItem(item)}
              >
                Скопировать
              </button>
              {!item.isPrimary ? (
                <button
                  type="button"
                  className={styles.btn}
                  disabled={disabled || pendingId === item.id}
                  onClick={() => void runAction(item.id, "setPrimary")}
                >
                  Сделать основными
                </button>
              ) : null}
              {item.applyForNextPayout ? (
                <span className={styles.label}>Для следующего расчёта</span>
              ) : (
                <button
                  type="button"
                  className={styles.btn}
                  disabled={disabled || pendingId === item.id}
                  onClick={() => void runAction(item.id, "applyForNextPayout")}
                >
                  Применить для следующего расчёта
                </button>
              )}
              <button
                type="button"
                className={styles.btn}
                disabled={disabled || pendingId === item.id}
                onClick={(e) => void openEdit(item.id, e.currentTarget)}
              >
                Изменить
              </button>
              <button
                type="button"
                className={styles.btn}
                disabled={disabled || pendingId === item.id}
                onClick={() => void runAction(item.id, "archive")}
              >
                Архивировать
              </button>
            </div>
          </li>
        );
        })}
      </ul>
      {copyStatus ? (
        <p className={styles.intro} role="status" data-testid="bank-copy-status">
          {copyStatus}
        </p>
      ) : null}
      <textarea
        ref={copyFallbackRef}
        className={styles.copyFallback}
        hidden
        readOnly
        aria-label="Реквизиты для ручного копирования"
      />
      <button
        type="button"
        className={`${styles.btn} ${styles.btnPrimary}`}
        disabled={disabled}
        onClick={(e) => openCreate(e.currentTarget)}
      >
        {items.length ? "Добавить ещё реквизиты" : "Добавить реквизиты"}
      </button>

      {formOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          className={styles.card}
          style={{ marginTop: "1rem", maxHeight: "min(80vh, 640px)", overflow: "auto" }}
        >
          <form onSubmit={onSubmit} className={styles.fields}>
            <h4 id={dialogTitleId}>{editId ? "Изменить набор" : "Новый набор"}</h4>
            <div className={styles.field}>
              <label htmlFor="req-label">Название набора</label>
              <input
                id="req-label"
                value={form.label}
                disabled={disabled || pendingId === "form"}
                placeholder="Например, Основной счёт"
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
              <small>Необязательно. Помогает отличать несколько наборов.</small>
            </div>
            <div className={styles.field}>
              <label htmlFor="req-kind">Тип получателя</label>
              <select
                id="req-kind"
                value={form.kind}
                disabled={disabled || pendingId === "form"}
                onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as FormState["kind"] }))}
              >
                <option value="person">Физическое лицо</option>
                <option value="ip">ИП</option>
                <option value="company">Юридическое лицо</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="req-name">ФИО / наименование</label>
              <input
                id="req-name"
                required
                value={form.legalName}
                disabled={disabled || pendingId === "form"}
                onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
              />
              {fieldErrors.legalName ? <small>{fieldErrors.legalName}</small> : null}
            </div>
            <div className={styles.field}>
              <label htmlFor="req-inn">ИНН</label>
              <input
                id="req-inn"
                value={form.inn}
                disabled={disabled || pendingId === "form"}
                onChange={(e) => setForm((f) => ({ ...f, inn: e.target.value }))}
              />
              {fieldErrors.inn ? <small>{fieldErrors.inn}</small> : null}
            </div>
            {form.kind === "company" ? (
              <div className={styles.field}>
                <label htmlFor="req-kpp">КПП</label>
                <input
                  id="req-kpp"
                  value={form.kpp}
                  disabled={disabled || pendingId === "form"}
                  onChange={(e) => setForm((f) => ({ ...f, kpp: e.target.value }))}
                />
                {fieldErrors.kpp ? <small>{fieldErrors.kpp}</small> : null}
              </div>
            ) : null}
            <div className={styles.field}>
              <label htmlFor="req-bank">Банк</label>
              <input
                id="req-bank"
                value={form.bankName}
                disabled={disabled || pendingId === "form"}
                onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
              />
            </div>
            <div className={`${styles.fields} ${styles.fieldsTwo}`}>
              <div className={styles.field}>
                <label htmlFor="req-bik">БИК</label>
                <input
                  id="req-bik"
                  value={form.bik}
                  disabled={disabled || pendingId === "form"}
                  onChange={(e) => setForm((f) => ({ ...f, bik: e.target.value }))}
                />
                {fieldErrors.bik ? <small>{fieldErrors.bik}</small> : null}
              </div>
              <div className={styles.field}>
                <label htmlFor="req-acc">Расчётный счёт</label>
                <input
                  id="req-acc"
                  value={form.accountNumber}
                  disabled={disabled || pendingId === "form"}
                  onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                />
                {fieldErrors.accountNumber ? <small>{fieldErrors.accountNumber}</small> : null}
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="req-corr">Корреспондентский счёт</label>
              <input
                id="req-corr"
                value={form.corrAccount}
                disabled={disabled || pendingId === "form"}
                onChange={(e) => setForm((f) => ({ ...f, corrAccount: e.target.value }))}
              />
              {fieldErrors.corrAccount ? <small>{fieldErrors.corrAccount}</small> : null}
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btn}
                disabled={pendingId === "form"}
                onClick={() => {
                  setFormOpen(false);
                  restoreFocusRef.current?.focus();
                }}
              >
                Отмена
              </button>
              <button
                type="submit"
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={disabled || pendingId === "form"}
              >
                {pendingId === "form" ? "Сохранение…" : "Сохранить"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
