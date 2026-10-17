"use client";

import { useCallback, useId, useRef, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { submitTaxonomyProposal, type TaxonomyProposalKind } from "@/lib/taxonomy-proposal-api";
import { cleanTaxonomyProposalText } from "@/lib/taxonomy-proposal-normalize";
import { Button } from "@/components/ui/Button";
import styles from "./TaxonomyProposalSection.module.css";

type Props = {
  kind: TaxonomyProposalKind;
  scopeKey: string;
  disabled?: boolean;
};

function validateLocal(name: string, description: string, kind: TaxonomyProposalKind): string | null {
  const cleaned = cleanTaxonomyProposalText(name);
  if (cleaned.length < 2 || cleaned.length > 80) {
    return kind === "STAGE"
      ? "Укажите название этапа от 2 до 80 символов."
      : "Укажите название категории от 2 до 80 символов.";
  }
  if (description.trim().length > 300) {
    return "Описание должно быть не длиннее 300 символов.";
  }
  return null;
}

export function TaxonomyProposalSection({ kind, scopeKey, disabled }: Props) {
  const panelId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const stage = kind === "STAGE";
  const toggleLabel = stage
    ? "Предложить новый этап"
    : "Предложить новую категорию";

  const resetForm = useCallback((close: boolean) => {
    setName("");
    setDescription("");
    setMessage("");
    setIsError(false);
    if (close) setOpen(false);
  }, []);

  async function sendProposal() {
    const localErr = validateLocal(name, description, kind);
    if (localErr) {
      setMessage(localErr);
      setIsError(true);
      nameRef.current?.focus();
      return;
    }
    setBusy(true);
    setMessage("");
    setIsError(false);
    try {
      const res = await submitTaxonomyProposal({
        kind,
        name: cleanTaxonomyProposalText(name),
        description: description.trim() || undefined,
      });
      if (!res.ok) {
        setMessage(res.message);
        setIsError(res.code === "VALIDATION");
        return;
      }
      setMessage(res.message);
      setIsError(false);
      setOpen(false);
      setName("");
      setDescription("");
    } catch (caught) {
      setMessage(
        caught instanceof RemcardApiError ? caught.message : "Не удалось отправить предложение.",
      );
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  function onToggle(checked: boolean) {
    setOpen(checked);
    if (!checked) {
      setMessage("");
      setIsError(false);
    }
  }

  function onCancel() {
    resetForm(true);
  }

  return (
    <section
      className={styles.wrap}
      data-testid={`taxonomy-proposal-${kind.toLowerCase()}`}
      data-proposal-scope={scopeKey}
      onKeyDown={(event) => {
        if (
          event.key === "Enter" &&
          open &&
          event.target instanceof HTMLInputElement &&
          event.target.name === "taxonomy-proposal-name"
        ) {
          event.preventDefault();
          event.stopPropagation();
          void sendProposal();
        }
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          onCancel();
        }
      }}
    >
      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={open}
          disabled={disabled || busy}
          aria-controls={panelId}
          onChange={(e) => onToggle(e.target.checked)}
          data-testid={`taxonomy-proposal-toggle-${kind.toLowerCase()}`}
        />
        <span>
          {toggleLabel} <small>в общий справочник</small>
        </span>
      </label>

      <div className={styles.form} id={panelId} hidden={!open}>
        <h3>{stage ? "Новый этап" : "Новая категория"} для общего справочника</h3>
        <p className={styles.hint}>
          Предложение не меняет выбранные категории и этапы вашего профиля. Принятие в общий
          справочник выполняется отдельно и не происходит автоматически.
        </p>
        <div className={styles.field}>
          <label htmlFor={`${panelId}-name`}>
            Название {stage ? "этапа" : "категории"}
          </label>
          <input
            ref={nameRef}
            id={`${panelId}-name`}
            name="taxonomy-proposal-name"
            type="text"
            maxLength={80}
            disabled={disabled || busy}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              stage
                ? "Например, восстановление после затопления"
                : "Например, реставрация лепнины"
            }
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${panelId}-desc`}>
            {stage ? "Что включает этот этап" : "Что входит в категорию"}{" "}
            <span className={styles.hint}>необязательно</span>
          </label>
          <textarea
            id={`${panelId}-desc`}
            maxLength={300}
            rows={2}
            disabled={disabled || busy}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Коротко опишите свой вариант"
          />
        </div>
        <div className={styles.actions}>
          <Button type="button" disabled={disabled || busy} onClick={() => void sendProposal()}>
            {busy ? "Отправка…" : "Отправить предложение"}
          </Button>
          <Button type="button" variant="text" disabled={busy} onClick={onCancel}>
            Отмена
          </Button>
        </div>
      </div>
      <p
        className={`${styles.status} ${isError ? styles.statusError : styles.statusOk}`}
        role="status"
        aria-live="polite"
        data-testid={`taxonomy-proposal-status-${kind.toLowerCase()}`}
      >
        {message}
      </p>
    </section>
  );
}
