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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
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
    if (!dialogOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDialogOpen(false);
        restoreFocusRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialogOpen]);

  const openCreate = (trigger: HTMLElement | null) => {
    restoreFocusRef.current = trigger;
    setEditId(null);
    setForm(emptyForm());
    setFieldErrors({});
    setDialogOpen(true);
  };

  const openEdit = async (id: string, trigger: HTMLElement | null) => {
    restoreFocusRef.current = trigger;
    setPendingId(id);
    setError("");
    try {
      const data = await fetchAgentRequisites(id);
      const item = data.item;
      setEditId(id);
      setForm({
        kind: (item.kind as FormState["kind"]) || "person",
        legalName: item.legalName ?? "",
        inn: item.inn ?? "",
        kpp: item.kpp ?? "",
        bankName: item.bankName ?? "",
        bik: item.bik ?? "",
        accountNumber: item.accountNumber ?? "",
        corrAccount: item.corrAccount ?? "",
      });
      setFieldErrors({});
      setDialogOpen(true);
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
        await patchAgentRequisites(editId, { action: "revise", ...form });
      } else {
        await createAgentRequisites({
          ...form,
          isPrimary: items.length === 0,
        });
      }
      setDialogOpen(false);
      restoreFocusRef.current?.focus();
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
      await reload();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось выполнить действие");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section className={styles.card} data-testid="agent-requisites-panel">
      <h3 className={styles.title}>Реквизиты для выплат</h3>
      <p className={styles.intro}>
        Необязательно для профиля. Изменения создают новую версию банковского набора; старые версии
        сохраняются для истории.
      </p>
      {error ? <p className={styles.bannerError}>{error}</p> : null}
      {loading ? <p className={styles.intro}>Загрузка…</p> : null}
      <ul className={styles.facts}>
        {items.map((item) => (
          <li key={item.id}>
            <div>
              <strong>{item.legalName}</strong>
              <small>
                {KIND_LABELS[item.kind] ?? item.kind}
                {item.inn ? ` · ИНН ${item.inn}` : ""}
                {item.accountNumberMasked ? ` · ${item.accountNumberMasked}` : ""}
                {item.version ? ` · v${item.version}` : ""}
              </small>
              <div className={styles.actionsRight}>
                {item.isPrimary ? <span className={styles.label}>Основной</span> : (
                  <button
                    type="button"
                    className={styles.btn}
                    disabled={disabled || pendingId === item.id}
                    onClick={(e) => void runAction(item.id, "setPrimary")}
                  >
                    Сделать основным
                  </button>
                )}
                {item.applyForNextPayout ? (
                  <span className={styles.label}>Для следующего расчёта</span>
                ) : (
                  <button
                    type="button"
                    className={styles.btn}
                    disabled={disabled || pendingId === item.id}
                    onClick={(e) => void runAction(item.id, "applyForNextPayout")}
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
                  onClick={(e) => void runAction(item.id, "archive")}
                >
                  Архивировать
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnPrimary}`}
        disabled={disabled}
        onClick={(e) => openCreate(e.currentTarget)}
      >
        Добавить реквизиты
      </button>

      {dialogOpen ? (
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
              <label htmlFor="req-kind">Тип</label>
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
                  setDialogOpen(false);
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
