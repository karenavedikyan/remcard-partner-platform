"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import {
  createAgentRequisites,
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

export function AgentPayoutRequisitesPanel({ disabled }: AgentPayoutRequisitesPanelProps) {
  const [items, setItems] = useState<AgentRequisitesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [kind, setKind] = useState<"person" | "ip" | "company">("person");
  const [form, setForm] = useState({
    legalName: "",
    inn: "",
    kpp: "",
    bankName: "",
    bik: "",
    accountNumber: "",
    corrAccount: "",
  });

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

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (disabled) return;
    try {
      await createAgentRequisites({
        kind,
        ...form,
        isPrimary: items.length === 0,
      });
      setDialogOpen(false);
      setForm({
        legalName: "",
        inn: "",
        kpp: "",
        bankName: "",
        bik: "",
        accountNumber: "",
        corrAccount: "",
      });
      await reload();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Ошибка сохранения");
    }
  };

  return (
    <section className={styles.card} data-testid="agent-requisites-panel">
      <h3 className={styles.title}>Реквизиты для выплат</h3>
      <p className={styles.intro}>
        Необязательно для профиля. Выбор набора влияет только на следующие расчёты, не на уже
        сохранённые документы.
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
              </small>
              <div className={styles.actionsRight}>
                {item.isPrimary ? <span className={styles.label}>Основной</span> : (
                  <button
                    type="button"
                    className={styles.btn}
                    disabled={disabled}
                    onClick={() => void patchAgentRequisites(item.id, { action: "setPrimary" }).then(reload)}
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
                    disabled={disabled}
                    onClick={() =>
                      void patchAgentRequisites(item.id, { action: "applyForNextPayout" }).then(reload)
                    }
                  >
                    Применить для следующего расчёта
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnPrimary}`}
        disabled={disabled}
        onClick={() => setDialogOpen(true)}
      >
        Добавить реквизиты
      </button>

      {dialogOpen ? (
        <div role="dialog" aria-modal="true" aria-labelledby="req-dialog-title">
          <form onSubmit={onCreate} className={styles.fields}>
            <h4 id="req-dialog-title">Новый набор</h4>
            <div className={styles.field}>
              <label htmlFor="req-kind">Тип</label>
              <select
                id="req-kind"
                value={kind}
                disabled={disabled}
                onChange={(e) => setKind(e.target.value as typeof kind)}
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
                disabled={disabled}
                onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="req-inn">ИНН</label>
              <input
                id="req-inn"
                value={form.inn}
                disabled={disabled}
                onChange={(e) => setForm((f) => ({ ...f, inn: e.target.value }))}
              />
            </div>
            {kind === "company" ? (
              <div className={styles.field}>
                <label htmlFor="req-kpp">КПП</label>
                <input
                  id="req-kpp"
                  value={form.kpp}
                  disabled={disabled}
                  onChange={(e) => setForm((f) => ({ ...f, kpp: e.target.value }))}
                />
              </div>
            ) : null}
            <div className={styles.field}>
              <label htmlFor="req-bank">Банк</label>
              <input
                id="req-bank"
                value={form.bankName}
                disabled={disabled}
                onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
              />
            </div>
            <div className={styles.fieldsTwo}>
              <div className={styles.field}>
                <label htmlFor="req-bik">БИК</label>
                <input
                  id="req-bik"
                  value={form.bik}
                  disabled={disabled}
                  onChange={(e) => setForm((f) => ({ ...f, bik: e.target.value }))}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="req-acc">Расчётный счёт</label>
                <input
                  id="req-acc"
                  value={form.accountNumber}
                  disabled={disabled}
                  onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                />
              </div>
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.btn} onClick={() => setDialogOpen(false)}>
                Отмена
              </button>
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={disabled}>
                Сохранить
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
