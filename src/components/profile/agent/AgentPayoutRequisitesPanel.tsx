"use client";

import { FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
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
import styles from "./AgentPayoutRequisitesPanel.module.css";

const KIND_LABELS: Record<string, string> = {
  person: "Физическое лицо",
  ip: "ИП",
  company: "Юридическое лицо",
};

type AgentPayoutRequisitesPanelProps = {
  disabled?: boolean;
  variant?: "profile" | "wallet";
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

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function accountSuffix(item: AgentRequisitesItem): string {
  const raw =
    item.accountNumber?.replace(/\D/g, "") ??
    item.accountNumberMasked?.replace(/\D/g, "") ??
    "";
  if (raw.length >= 4) return raw.slice(-4);
  const masked = item.accountNumberMasked ?? "";
  const match = masked.match(/(\d{4})\s*$/);
  return match?.[1] ?? "····";
}

function pickDefaultWalletId(items: AgentRequisitesItem[]): string | null {
  if (!items.length) return null;
  return (
    items.find((i) => i.applyForNextPayout)?.id ??
    items.find((i) => i.isPrimary)?.id ??
    items[0].id
  );
}

function isVersionConflict(error: unknown): boolean {
  return (
    error instanceof RemcardApiError &&
    error.status === 409 &&
    error.body?.code === "VERSION_CONFLICT"
  );
}

function profileAccountLine(item: AgentRequisitesItem): string {
  const parts = [KIND_LABELS[item.kind] ?? item.kind];
  if (item.bankName) parts.push(item.bankName);
  parts.push(`счёт …${accountSuffix(item)}`);
  return parts.join(" · ");
}

function bankFieldsTouched(form: FormState): boolean {
  return !!(
    form.bankName.trim() ||
    form.bik.trim() ||
    form.accountNumber.trim() ||
    form.corrAccount.trim()
  );
}

function validateClientForm(
  form: FormState,
  mode: "create" | "revise",
  fieldId: (key: string) => string,
): {
  fieldErrors: Partial<Record<keyof FormState, string>>;
  formError: string;
  firstFieldId: string | null;
} {
  const fieldErrors: Partial<Record<keyof FormState, string>> = {};
  let formError = "";
  let firstFieldId: string | null = null;

  const mark = (key: keyof FormState, message: string, idKey: string) => {
    if (!fieldErrors[key]) {
      fieldErrors[key] = message;
      if (!firstFieldId) firstFieldId = fieldId(idKey);
      if (!formError) formError = message;
    }
  };

  if (!form.legalName.trim()) {
    mark("legalName", "Укажите получателя.", "name");
  }

  const requireBank = mode === "create" || bankFieldsTouched(form);
  if (requireBank) {
    if (!form.bankName.trim()) {
      mark("bankName", "Укажите название банка.", "bank");
    }
    const bik = digitsOnly(form.bik);
    if (!/^\d{9}$/.test(bik)) {
      mark("bik", "БИК должен содержать 9 цифр.", "bik");
    }
    const account = form.accountNumber.replace(/\s/g, "");
    if (!/^\d{20}$/.test(account)) {
      mark("accountNumber", "Счёт должен содержать 20 цифр.", "acc");
    }
    const corr = form.corrAccount.replace(/\s/g, "");
    if (!/^\d{20}$/.test(corr)) {
      mark("corrAccount", "Корреспондентский счёт должен содержать 20 цифр.", "corr");
    }
  }

  const inn = digitsOnly(form.inn);
  if (form.kind === "company") {
    if (!/^\d{10}$/.test(inn)) {
      mark(
        "inn",
        "Проверьте длину ИНН: 10 цифр для организации, 12 для физлица или ИП.",
        "inn",
      );
    }
  } else if (form.kind === "ip") {
    if (!/^\d{12}$/.test(inn)) {
      mark(
        "inn",
        "Проверьте длину ИНН: 10 цифр для организации, 12 для физлица или ИП.",
        "inn",
      );
    }
  } else if (inn && !/^\d{12}$/.test(inn)) {
    mark(
      "inn",
      "Проверьте длину ИНН: 10 цифр для организации, 12 для физлица или ИП.",
      "inn",
    );
  }

  if (form.kind === "company") {
    const kpp = digitsOnly(form.kpp);
    if (!/^\d{9}$/.test(kpp)) {
      mark("kpp", "КПП должен содержать 9 цифр.", "kpp");
    }
  }

  return { fieldErrors, formError, firstFieldId };
}

function buildCreatePayload(form: FormState, isFirstItem: boolean) {
  const payload: Record<string, unknown> = {
    kind: form.kind,
    legalName: form.legalName.trim(),
    label: form.label.trim() || undefined,
    bankName: form.bankName.trim(),
    bik: digitsOnly(form.bik),
    accountNumber: form.accountNumber.replace(/\s/g, ""),
    corrAccount: form.corrAccount.replace(/\s/g, ""),
    inn: digitsOnly(form.inn) || undefined,
    isPrimary: isFirstItem,
  };
  if (form.kind === "company") {
    payload.kpp = digitsOnly(form.kpp);
  }
  return payload;
}

function buildRevisePayload(form: FormState, expectedVersion: number | null) {
  const body: Record<string, unknown> = {
    action: "revise",
    kind: form.kind,
    legalName: form.legalName.trim(),
    label: form.label.trim() || null,
    bankName: form.bankName.trim(),
    bik: digitsOnly(form.bik),
    accountNumber: form.accountNumber.replace(/\s/g, ""),
    corrAccount: form.corrAccount.replace(/\s/g, ""),
    inn: digitsOnly(form.inn),
    kpp: form.kind === "company" ? digitsOnly(form.kpp) : "",
  };
  if (expectedVersion != null) {
    body.expectedVersion = expectedVersion;
  }
  return body;
}

export function AgentPayoutRequisitesPanel({
  disabled = false,
  variant = "profile",
}: AgentPayoutRequisitesPanelProps) {
  const isWallet = variant === "wallet";
  const mutatingDisabled = disabled;
  const fieldUid = useId().replace(/:/g, "");
  const fieldId = (key: string) => `req-${fieldUid}-${key}`;
  const [items, setItems] = useState<AgentRequisitesItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [formAlert, setFormAlert] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [detailById, setDetailById] = useState<Record<string, AgentRequisitesItem>>({});
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const copyFallbackRef = useRef<HTMLTextAreaElement>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editExpectedVersion, setEditExpectedVersion] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const dialogTitleId = useId();
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const hasLoadedListRef = useRef(false);

  const heading = isWallet ? "Куда получать оплату" : "Реквизиты для получения оплаты";
  const restrictionMark = mutatingDisabled ? "Изменения недоступны" : "Необязательно";

  const reload = useCallback(async () => {
    if (!hasLoadedListRef.current) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const data = await listAgentRequisites();
      setItems(data.items ?? []);
      hasLoadedListRef.current = true;
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить реквизиты");
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  const resyncAfterVersionConflict = useCallback(
    async (recordId: string) => {
      setRefreshing(true);
      try {
        const data = await listAgentRequisites();
        setItems(data.items ?? []);
        setDetailById((prev) => {
          const next = { ...prev };
          delete next[recordId];
          return next;
        });
        try {
          const fresh = await fetchAgentRequisites(recordId);
          setDetailById((prev) => ({ ...prev, [recordId]: fresh.item }));
          if (formOpen && editId === recordId) {
            setEditExpectedVersion(fresh.item.version);
          }
        } catch {
          /* list refresh still helps retry */
        }
        setError(
          "Реквизиты были изменены в другом окне. Данные обновлены — проверьте форму и сохраните снова.",
        );
      } finally {
        setRefreshing(false);
      }
    },
    [editId, formOpen],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!isWallet || !items.length) return;
    setSelectedWalletId((prev) => {
      if (prev && items.some((i) => i.id === prev)) return prev;
      return pickDefaultWalletId(items);
    });
  }, [items, isWallet]);

  useEffect(() => {
    if (!formOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFormOpen(false);
        setFormAlert("");
        queueMicrotask(() => restoreFocusRef.current?.focus());
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

  const selectedWalletItem = useMemo(() => {
    if (!selectedWalletId) return null;
    const base = items.find((i) => i.id === selectedWalletId);
    return base ? mergeListWithDetail(base) : null;
  }, [items, selectedWalletId, detailById]);

  const openCreate = (trigger: HTMLElement | null) => {
    restoreFocusRef.current = trigger;
    setEditId(null);
    setEditExpectedVersion(null);
    setForm(emptyForm());
    setFieldErrors({});
    setFormAlert("");
    setFormOpen(true);
  };

  const openEdit = async (id: string, trigger: HTMLElement | null) => {
    restoreFocusRef.current = trigger;
    setPendingId(id);
    setError("");
    setFormAlert("");
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
    if (mutatingDisabled || pendingId === "form") return;

    const clientValidation = validateClientForm(form, editId ? "revise" : "create", fieldId);
    if (clientValidation.formError) {
      setFieldErrors(clientValidation.fieldErrors);
      setFormAlert(clientValidation.formError);
      if (clientValidation.firstFieldId) {
        document.getElementById(clientValidation.firstFieldId)?.focus();
      }
      return;
    }

    setPendingId("form");
    setFieldErrors({});
    setFormAlert("");
    setError("");
    try {
      if (editId) {
        await patchAgentRequisites(editId, buildRevisePayload(form, editExpectedVersion));
      } else {
        await createAgentRequisites(buildCreatePayload(form, items.length === 0));
      }
      setFormOpen(false);
      restoreFocusRef.current?.focus();
      setDetailById({});
      setExpandedId(null);
      await reload();
    } catch (caught) {
      if (isVersionConflict(caught) && editId) {
        await resyncAfterVersionConflict(editId);
      } else if (caught instanceof RemcardApiError && caught.body?.fields) {
        setFieldErrors(caught.body.fields as Partial<Record<keyof FormState, string>>);
        setError(caught.message);
      } else {
        setError(caught instanceof RemcardApiError ? caught.message : "Ошибка сохранения");
      }
    } finally {
      setPendingId(null);
    }
  };

  const runAction = async (id: string, action: "setPrimary" | "applyForNextPayout" | "archive") => {
    if (mutatingDisabled || pendingId) return;
    if (action === "archive" && !window.confirm("Архивировать этот набор? Он не будет доступен для нового выбора.")) {
      return;
    }
    setPendingId(id);
    setError("");
    setStatusMessage("");
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
      if (isVersionConflict(caught)) {
        await resyncAfterVersionConflict(id);
      } else {
        setError(caught instanceof RemcardApiError ? caught.message : "Не удалось выполнить действие");
      }
    } finally {
      setPendingId(null);
    }
  };

  const copyItem = async (item: AgentRequisitesItem) => {
    if (disabled) return;
    setStatusMessage("");
    setError("");
    const full = await ensureFullDetail(item.id);
    if (!full || !hasFullRequisitesForCopy(full)) {
      setError("Не удалось загрузить полные реквизиты для копирования. Повторите попытку.");
      return;
    }
    const text = formatRequisitesCopyText(full);
    try {
      await navigator.clipboard.writeText(text);
      setStatusMessage("Скопировано в буфер обмена");
    } catch {
      if (copyFallbackRef.current) {
        copyFallbackRef.current.hidden = false;
        copyFallbackRef.current.value = text;
        copyFallbackRef.current.select();
        setStatusMessage("Скопируйте текст вручную из поля ниже");
      } else {
        setStatusMessage("Не удалось скопировать автоматически");
      }
    }
  };

  const toggleExpanded = async (item: AgentRequisitesItem) => {
    if (disabled) return;
    if (expandedId === item.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(item.id);
    await ensureFullDetail(item.id);
  };

  const accountLabel =
    form.kind === "person" ? "Номер банковского счёта" : "Расчётный счёт";

  const renderDetailFacts = (display: AgentRequisitesItem) => (
    <dl className={styles.summaryFacts} data-testid="bank-record-detail">
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
          <dd data-testid="bank-detail-inn">{display.inn}</dd>
        </div>
      ) : null}
      {display.kpp ? (
        <div>
          <dt>КПП</dt>
          <dd>{display.kpp}</dd>
        </div>
      ) : null}
    </dl>
  );

  const renderForm = () => (
    <form
      onSubmit={onSubmit}
      className={styles.bankInlineForm}
      data-bank-form
      data-testid="agent-requisites-form"
      noValidate
    >
      <h3 id={dialogTitleId}>{editId ? "Изменить реквизиты" : "Новые реквизиты"}</h3>
      <div className={styles.field}>
        <label htmlFor={fieldId("kind")}>Тип получателя</label>
        <select
          id={fieldId("kind")}
          data-testid="bank-type"
          value={form.kind}
          disabled={mutatingDisabled || pendingId === "form"}
          onChange={(e) => {
            setForm((f) => ({ ...f, kind: e.target.value as FormState["kind"] }));
            setFormAlert("");
          }}
        >
          <option value="person">Физическое лицо</option>
          <option value="ip">ИП</option>
          <option value="company">Юридическое лицо</option>
        </select>
      </div>
      <div className={`${styles.fields} ${styles.fieldsTwo}`}>
        <div className={styles.field}>
          <label htmlFor={fieldId("label")}>Название набора</label>
          <input
            id={fieldId("label")}
            data-testid="bank-label"
            value={form.label}
            disabled={mutatingDisabled || pendingId === "form"}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            autoComplete="off"
          />
          <small>Например, Личный счёт или Основной счёт компании.</small>
        </div>
        <div className={styles.field}>
          <label htmlFor={fieldId("name")}>
            {legalNameLabel(form.kind)}
            <span className={styles.required}> *</span>
          </label>
          <input
            id={fieldId("name")}
            data-testid="bank-recipient"
            value={form.legalName}
            disabled={mutatingDisabled || pendingId === "form"}
            aria-invalid={fieldErrors.legalName ? "true" : undefined}
            onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
            autoComplete="off"
          />
          {fieldErrors.legalName ? (
            <small className={styles.fieldError}>{fieldErrors.legalName}</small>
          ) : null}
        </div>
        <div className={styles.field}>
          <label htmlFor={fieldId("bank")}>
            Название банка<span className={styles.required}> *</span>
          </label>
          <input
            id={fieldId("bank")}
            data-testid="bank-bank"
            value={form.bankName}
            disabled={mutatingDisabled || pendingId === "form"}
            aria-invalid={fieldErrors.bankName ? "true" : undefined}
            onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
            autoComplete="off"
          />
          {fieldErrors.bankName ? (
            <small className={styles.fieldError}>{fieldErrors.bankName}</small>
          ) : null}
        </div>
        <div className={styles.field}>
          <label htmlFor={fieldId("bik")}>
            БИК<span className={styles.required}> *</span>
          </label>
          <input
            id={fieldId("bik")}
            data-testid="bank-bik"
            inputMode="numeric"
            value={form.bik}
            disabled={mutatingDisabled || pendingId === "form"}
            aria-invalid={fieldErrors.bik ? "true" : undefined}
            onChange={(e) => setForm((f) => ({ ...f, bik: e.target.value }))}
            autoComplete="off"
          />
          <small>9 цифр.</small>
          {fieldErrors.bik ? <small className={styles.fieldError}>{fieldErrors.bik}</small> : null}
        </div>
        <div className={styles.field}>
          <label htmlFor={fieldId("acc")}>
            {accountLabel}
            <span className={styles.required}> *</span>
          </label>
          <input
            id={fieldId("acc")}
            data-testid="bank-account"
            inputMode="numeric"
            value={form.accountNumber}
            disabled={mutatingDisabled || pendingId === "form"}
            aria-invalid={fieldErrors.accountNumber ? "true" : undefined}
            onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
            autoComplete="off"
          />
          <small>20 цифр. Не номер карты.</small>
          {fieldErrors.accountNumber ? (
            <small className={styles.fieldError}>{fieldErrors.accountNumber}</small>
          ) : null}
        </div>
        <div className={styles.field}>
          <label htmlFor={fieldId("corr")}>
            Корреспондентский счёт<span className={styles.required}> *</span>
          </label>
          <input
            id={fieldId("corr")}
            data-testid="bank-correspondent"
            inputMode="numeric"
            value={form.corrAccount}
            disabled={mutatingDisabled || pendingId === "form"}
            aria-invalid={fieldErrors.corrAccount ? "true" : undefined}
            onChange={(e) => setForm((f) => ({ ...f, corrAccount: e.target.value }))}
            autoComplete="off"
          />
          <small>20 цифр.</small>
          {fieldErrors.corrAccount ? (
            <small className={styles.fieldError}>{fieldErrors.corrAccount}</small>
          ) : null}
        </div>
        <div className={styles.field}>
          <label htmlFor={fieldId("inn")}>
            ИНН получателя
            {form.kind !== "person" ? <span className={styles.required}> *</span> : null}
          </label>
          <input
            id={fieldId("inn")}
            data-testid="bank-inn"
            inputMode="numeric"
            value={form.inn}
            disabled={mutatingDisabled || pendingId === "form"}
            aria-invalid={fieldErrors.inn ? "true" : undefined}
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
          {fieldErrors.inn ? <small className={styles.fieldError}>{fieldErrors.inn}</small> : null}
        </div>
        {form.kind === "company" ? (
          <div className={styles.field}>
            <label htmlFor={fieldId("kpp")}>
              КПП<span className={styles.required}> *</span>
            </label>
            <input
              id={fieldId("kpp")}
              data-testid="bank-kpp"
              inputMode="numeric"
              value={form.kpp}
              disabled={mutatingDisabled || pendingId === "form"}
              aria-invalid={fieldErrors.kpp ? "true" : undefined}
              onChange={(e) => setForm((f) => ({ ...f, kpp: e.target.value }))}
              autoComplete="off"
            />
            <small>9 цифр.</small>
            {fieldErrors.kpp ? <small className={styles.fieldError}>{fieldErrors.kpp}</small> : null}
          </div>
        ) : null}
      </div>
      {formAlert ? (
        <p className={styles.formAlert} role="alert" data-testid="bank-error">
          {formAlert}
        </p>
      ) : null}
      <div className={styles.bankFormActions}>
        <button
          type="submit"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={mutatingDisabled || pendingId === "form"}
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
            setFormAlert("");
            queueMicrotask(() => restoreFocusRef.current?.focus());
          }}
        >
          Отменить
        </button>
      </div>
    </form>
  );

  const renderProfileList = () => (
    <>
      {items.length === 0 ? (
        <p className={styles.intro}>
          Добавьте банковский счёт, на который партнёры смогут перечислять оплату по безналичному
          расчёту. Это необязательно для заполнения профиля.
        </p>
      ) : null}
      <ul className={styles.requisitesList}>
        {items.map((item) => {
          const display = mergeListWithDetail(item);
          const loadingDetail = detailLoadingId === item.id;
          return (
            <li
              key={item.id}
              className={styles.bankRecord}
              data-testid="bank-record"
              data-requisites-id={item.id}
            >
              <div className={styles.bankCardHead}>
                <strong>{item.label?.trim() || item.legalName}</strong>
                {item.isPrimary ? <span className={styles.status}>Основные</span> : null}
              </div>
              <small>{profileAccountLine(item)}</small>
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
                  disabled={mutatingDisabled || pendingId === item.id}
                  onClick={(e) => void openEdit(item.id, e.currentTarget)}
                >
                  Изменить
                </button>
              </div>
              {expandedId === item.id ? (
                loadingDetail ? (
                  <p className={styles.intro}>Загрузка полных реквизитов…</p>
                ) : (
                  renderDetailFacts(display)
                )
              ) : null}
              <details className={styles.bankMoreActions}>
                <summary>Дополнительные действия</summary>
                <div className={styles.bankActionsSecondary}>
                  {!item.isPrimary ? (
                    <button
                      type="button"
                      className={styles.btn}
                      disabled={mutatingDisabled || pendingId === item.id}
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
                      disabled={mutatingDisabled || pendingId === item.id}
                      onClick={() => void runAction(item.id, "applyForNextPayout")}
                    >
                      Применить для следующего расчёта
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.btn}
                    disabled={mutatingDisabled || pendingId === item.id}
                    onClick={() => void runAction(item.id, "archive")}
                  >
                    Архивировать
                  </button>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </>
  );

  const renderWalletBody = () => {
    if (!items.length) {
      return (
        <>
          <p className={styles.intro}>
            Добавьте банковский счёт, на который партнёры смогут перечислять оплату по безналичному
            расчёту. Это необязательно для заполнения профиля.
          </p>
          <button
            type="button"
            className={styles.btnBankAdd}
            disabled={mutatingDisabled}
            onClick={(e) => openCreate(e.currentTarget)}
          >
            Добавить реквизиты
          </button>
        </>
      );
    }

    const selected = selectedWalletItem ?? mergeListWithDetail(items[0]);
    const loadingDetail = detailLoadingId === selected.id;

    return (
      <>
        <div className={styles.field}>
          <label htmlFor={fieldId("wallet-select")}>Получатель оплаты</label>
          <select
            id={fieldId("wallet-select")}
            data-testid="bank-select"
            disabled={disabled}
            value={selectedWalletId ?? selected.id}
            onChange={(e) => {
              setSelectedWalletId(e.target.value);
              setExpandedId(null);
              setStatusMessage("");
            }}
          >
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {(item.label?.trim() || item.legalName) + ` · …${accountSuffix(item)}`}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.walletPreview}>
          <span className={styles.kicker}>
            {KIND_LABELS[selected.kind] ?? selected.kind}
            {selected.isPrimary ? " · основные реквизиты" : ""}
          </span>
          <strong className={styles.previewTitle}>
            {selected.label?.trim() || selected.legalName}
          </strong>
          <p className={styles.previewMuted}>
            {selected.bankName ? `${selected.bankName} · ` : ""}
            счёт …{accountSuffix(selected)}
          </p>
        </div>
        <div className={styles.walletActions}>
          <button
            type="button"
            className={styles.btn}
            disabled={disabled || pendingId === selected.id || loadingDetail}
            onClick={() => void toggleExpanded(selected)}
          >
            {expandedId === selected.id ? "Скрыть подробности" : "Посмотреть полностью"}
          </button>
          <button
            type="button"
            className={styles.btn}
            disabled={disabled || pendingId === selected.id}
            onClick={() => void copyItem(selected)}
          >
            Скопировать реквизиты
          </button>
          {selected.applyForNextPayout ? (
            <span className={styles.label}>Для следующего расчёта</span>
          ) : (
            <button
              type="button"
              className={styles.btn}
              disabled={mutatingDisabled || pendingId === selected.id}
              onClick={() => void runAction(selected.id, "applyForNextPayout")}
            >
              Применить для следующего расчёта
            </button>
          )}
          <button
            type="button"
            className={styles.btnBankAdd}
            disabled={mutatingDisabled}
            onClick={(e) => openCreate(e.currentTarget)}
          >
            Добавить реквизиты
          </button>
        </div>
        {expandedId === selected.id ? (
          loadingDetail ? (
            <p className={styles.intro}>Загрузка полных реквизитов…</p>
          ) : (
            renderDetailFacts(mergeListWithDetail(selected))
          )
        ) : null}
        <details className={styles.bankMoreActions} data-testid="bank-wallet-more-actions">
          <summary>Дополнительные действия</summary>
          <div className={styles.bankActionsSecondary}>
            <button
              type="button"
              className={styles.btn}
              disabled={mutatingDisabled || pendingId === selected.id}
              onClick={(e) => void openEdit(selected.id, e.currentTarget)}
            >
              Изменить
            </button>
            {!selected.isPrimary ? (
              <button
                type="button"
                className={styles.btn}
                disabled={mutatingDisabled || pendingId === selected.id}
                onClick={() => void runAction(selected.id, "setPrimary")}
              >
                Сделать основными
              </button>
            ) : null}
            <button
              type="button"
              className={styles.btn}
              disabled={mutatingDisabled || pendingId === selected.id}
              onClick={() => void runAction(selected.id, "archive")}
            >
              Архивировать
            </button>
          </div>
        </details>
        {selected.applyForNextPayout ? (
          <p className={styles.bannerSuccess} data-testid="bank-apply-success">
            Для следующего расчёта выбраны: {selected.label?.trim() || selected.legalName}.
          </p>
        ) : null}
        <p className={styles.footnote}>
          Это реквизиты для получения оплаты, не вывод бонусов. Выбор не меняет уже оформленные
          счета и расчёты.
        </p>
      </>
    );
  };

  return (
    <section
      className={`${styles.scope} ${styles.card} ${styles.bankPanel}`}
      data-testid="bank-panel"
      data-bank-panel
    >
      <div className={styles.cardTop}>
        <h2 className={styles.title}>{heading}</h2>
        <span className={styles.optionalMark}>{restrictionMark}</span>
      </div>
      {error ? <p className={styles.bannerError}>{error}</p> : null}
      {initialLoading && !formOpen ? <p className={styles.intro}>Загрузка…</p> : null}
      {refreshing ? (
        <p className={styles.refreshHint} aria-live="polite">
          Обновление…
        </p>
      ) : null}

      {formOpen ? (
        renderForm()
      ) : !initialLoading ? (
        <>
          {isWallet ? renderWalletBody() : renderProfileList()}
          <textarea
            ref={copyFallbackRef}
            className={styles.copyFallback}
            hidden
            readOnly
            aria-label="Реквизиты для ручного копирования"
            data-bank-copy-value
          />
          {!isWallet ? (
            <button
              type="button"
              className={styles.btnBankAdd}
              disabled={mutatingDisabled}
              onClick={(e) => openCreate(e.currentTarget)}
            >
              {items.length ? "Добавить ещё реквизиты" : "Добавить реквизиты"}
            </button>
          ) : null}
        </>
      ) : null}
      <p className={styles.bankStatus} role="status" data-testid="bank-status">
        {statusMessage}
      </p>
    </section>
  );
}
