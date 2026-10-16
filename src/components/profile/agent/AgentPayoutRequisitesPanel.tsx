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
import {
  formatRequisitesCopyText,
  hasFullRequisitesForCopy,
} from "@/lib/agent-profile/format-requisites-copy";
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

function legalNameLabel(kind: FormState["kind"]): string {
  if (kind === "company") return "Название организации-получателя";
  if (kind === "ip") return "ИП, фамилия, имя и отчество";
  return "Фамилия, имя и отчество получателя";
}

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

  const copyItem = async (item: AgentRequisitesItem) => {
    setCopyStatus("");
    setError("");
    const full = await ensureFullDetail(item.id);
    if (!full || !hasFullRequisitesForCopy(full)) {
      setError("Не удалось загрузить полные реквизиты для копирования. Повторите попытку.");
      return;
    }
    const text = formatRequisitesCopyText(full);
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

  const accountLabel =
    form.kind === "person" ? "Номер банковского счёта" : "Расчётный счёт";

  return (
    <section className={`${styles.card} ${styles.bankPanel}`} data-testid="bank-panel">
      <div className={styles.cardTop}>
        <h2 className={styles.title}>Реквизиты для получения оплаты</h2>
        <span className={styles.optionalMark}>Необязательно</span>
      </div>
      {error ? <p className={styles.bannerError}>{error}</p> : null}
      {loading ? <p className={styles.intro}>Загрузка…</p> : null}

      {formOpen ? (
        <form
          onSubmit={onSubmit}
          className={styles.bankInlineForm}
          data-bank-form
          data-testid="agent-requisites-form"
        >
          <h3 id={dialogTitleId}>{editId ? "Изменить реквизиты" : "Новые реквизиты"}</h3>
          <div className={`${styles.fields} ${styles.fieldsTwo}`}>
            <div className={styles.field}>
              <label htmlFor="req-label">Название набора</label>
              <input
                id="req-label"
                data-testid="bank-label"
                value={form.label}
                disabled={disabled || pendingId === "form"}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                autoComplete="off"
              />
              <small>Например, Личный счёт или Основной счёт компании.</small>
            </div>
            <div className={styles.field}>
              <label htmlFor="req-kind">Тип получателя</label>
              <select
                id="req-kind"
                data-testid="bank-type"
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
              <label htmlFor="req-name">
                {legalNameLabel(form.kind)}
                <span className={styles.required}> *</span>
              </label>
              <input
                id="req-name"
                data-testid="bank-recipient"
                required
                value={form.legalName}
                disabled={disabled || pendingId === "form"}
                onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
                autoComplete="off"
              />
              {fieldErrors.legalName ? <small>{fieldErrors.legalName}</small> : null}
            </div>
            <div className={styles.field}>
              <label htmlFor="req-bank">
                Название банка<span className={styles.required}> *</span>
              </label>
              <input
                id="req-bank"
                data-testid="bank-bank"
                required
                value={form.bankName}
                disabled={disabled || pendingId === "form"}
                onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                autoComplete="off"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="req-bik">
                БИК<span className={styles.required}> *</span>
              </label>
              <input
                id="req-bik"
                data-testid="bank-bik"
                inputMode="numeric"
                required
                value={form.bik}
                disabled={disabled || pendingId === "form"}
                onChange={(e) => setForm((f) => ({ ...f, bik: e.target.value }))}
                autoComplete="off"
              />
              <small>9 цифр.</small>
              {fieldErrors.bik ? <small>{fieldErrors.bik}</small> : null}
            </div>
            <div className={styles.field}>
              <label htmlFor="req-acc">
                {accountLabel}
                <span className={styles.required}> *</span>
              </label>
              <input
                id="req-acc"
                data-testid="bank-account"
                inputMode="numeric"
                required
                value={form.accountNumber}
                disabled={disabled || pendingId === "form"}
                onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                autoComplete="off"
              />
              <small>20 цифр. Не номер карты.</small>
              {fieldErrors.accountNumber ? <small>{fieldErrors.accountNumber}</small> : null}
            </div>
            <div className={styles.field}>
              <label htmlFor="req-corr">
                Корреспондентский счёт<span className={styles.required}> *</span>
              </label>
              <input
                id="req-corr"
                data-testid="bank-correspondent"
                inputMode="numeric"
                required
                value={form.corrAccount}
                disabled={disabled || pendingId === "form"}
                onChange={(e) => setForm((f) => ({ ...f, corrAccount: e.target.value }))}
                autoComplete="off"
              />
              <small>20 цифр.</small>
              {fieldErrors.corrAccount ? <small>{fieldErrors.corrAccount}</small> : null}
            </div>
            <div className={styles.field}>
              <label htmlFor="req-inn">
                ИНН получателя
                {form.kind !== "person" ? <span className={styles.required}> *</span> : null}
              </label>
              <input
                id="req-inn"
                data-testid="bank-inn"
                inputMode="numeric"
                value={form.inn}
                disabled={disabled || pendingId === "form"}
                onChange={(e) => setForm((f) => ({ ...f, inn: e.target.value }))}
                autoComplete="off"
              />
              <small>
                {form.kind === "company"
                  ? "10 цифр."
                  : form.kind === "ip"
                    ? "12 цифр."
                    : "12 цифр. Для физического лица необязательно."}
              </small>
              {fieldErrors.inn ? <small>{fieldErrors.inn}</small> : null}
            </div>
            {form.kind === "company" ? (
              <div className={styles.field}>
                <label htmlFor="req-kpp">КПП</label>
                <input
                  id="req-kpp"
                  data-testid="bank-kpp"
                  inputMode="numeric"
                  value={form.kpp}
                  disabled={disabled || pendingId === "form"}
                  onChange={(e) => setForm((f) => ({ ...f, kpp: e.target.value }))}
                  autoComplete="off"
                />
                <small>9 цифр, если применимо.</small>
                {fieldErrors.kpp ? <small>{fieldErrors.kpp}</small> : null}
              </div>
            ) : null}
          </div>
          <div className={styles.bankFormActions}>
            <button
              type="submit"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={disabled || pendingId === "form"}
              data-testid="bank-save"
            >
              {pendingId === "form" ? "Сохранение…" : "Сохранить реквизиты"}
            </button>
            <button
              type="button"
              className={styles.btn}
              disabled={pendingId === "form"}
              data-testid="bank-cancel"
              onClick={() => {
                setFormOpen(false);
                restoreFocusRef.current?.focus();
              }}
            >
              Отменить
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className={styles.intro}>
            {items.length === 0
              ? "Добавьте банковский счёт, на который партнёры смогут перечислять оплату по безналичному расчёту. Это необязательно для заполнения профиля."
              : "Добавьте банковский счёт для безналичных выплат. Это не требуется для сохранения профиля."}
          </p>
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
                    {item.bankName ? ` · ${item.bankName}` : ""}
                    {item.accountNumberMasked ? ` · ${item.accountNumberMasked}` : ""}
                  </small>
                  {expandedId === item.id ? (
                    loadingDetail ? (
                      <p className={styles.intro}>Загрузка полных реквизитов…</p>
                    ) : (
                      <dl className={styles.summaryFacts}>
                        <div>
                          <dt>Тип получателя</dt>
                          <dd>{KIND_LABELS[display.kind] ?? display.kind}</dd>
                        </div>
                        <div>
                          <dt>Получатель</dt>
                          <dd>{display.legalName}</dd>
                        </div>
                        <div>
                          <dt>Банк</dt>
                          <dd>{display.bankName}</dd>
                        </div>
                        {display.bik ? (
                          <div>
                            <dt>БИК</dt>
                            <dd>{display.bik}</dd>
                          </div>
                        ) : null}
                        {display.accountNumber ? (
                          <div>
                            <dt>Счёт</dt>
                            <dd>{display.accountNumber}</dd>
                          </div>
                        ) : null}
                        {display.corrAccount ? (
                          <div>
                            <dt>Корреспондентский счёт</dt>
                            <dd>{display.corrAccount}</dd>
                          </div>
                        ) : null}
                        {display.inn ? (
                          <div>
                            <dt>ИНН</dt>
                            <dd>{display.inn}</dd>
                          </div>
                        ) : null}
                        {display.kpp ? (
                          <div>
                            <dt>КПП</dt>
                            <dd>{display.kpp}</dd>
                          </div>
                        ) : null}
                      </dl>
                    )
                  ) : null}
                  <div className={styles.bankActionsPrimary}>
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
                    <button
                      type="button"
                      className={styles.btn}
                      disabled={disabled || pendingId === item.id}
                      onClick={(e) => void openEdit(item.id, e.currentTarget)}
                    >
                      Изменить
                    </button>
                  </div>
                  <div className={styles.bankActionsSecondary}>
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
            className={styles.btnBankAdd}
            disabled={disabled}
            onClick={(e) => openCreate(e.currentTarget)}
          >
            {items.length ? "Добавить ещё реквизиты" : "Добавить реквизиты"}
          </button>
        </>
      )}
    </section>
  );
}
