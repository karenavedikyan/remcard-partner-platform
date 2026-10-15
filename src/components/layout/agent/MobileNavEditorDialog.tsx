"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  agentSectionByKey,
  defaultAgentMobileNavKeys,
  type AgentNavSectionKey,
} from "@/lib/agent-nav/sections";
import {
  applyMobileNavReplacement,
  canSaveMobileNavEditor,
  moveMobileNavKey,
  toggleMobileNavChoice,
  type MobileNavEditorState,
} from "@/lib/agent-nav/mobile-nav-editor";
import { AgentNavIcon } from "@/components/layout/agent/AgentNavIcon";
import { NAV_ICONS } from "@/components/layout/NavIcons";
import styles from "./MobileNavEditorDialog.module.css";

type MobileNavEditorDialogProps = {
  open: boolean;
  initialKeys: AgentNavSectionKey[];
  permittedKeys: AgentNavSectionKey[];
  onClose: () => void;
  onSave: (keys: AgentNavSectionKey[]) => Promise<void>;
};

export function MobileNavEditorDialog({
  open,
  initialKeys,
  permittedKeys,
  onClose,
  onSave,
}: MobileNavEditorDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<MobileNavEditorState>({
    draft: initialKeys,
    replacement: null,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setState({ draft: [...initialKeys], replacement: null });
      setSaveError(null);
      setSaving(false);
    }
  }, [open, initialKeys]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const onDialogCancel = useCallback(
    (event: Event) => {
      event.preventDefault();
      onClose();
    },
    [onClose],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.addEventListener("cancel", onDialogCancel);
    return () => dialog.removeEventListener("cancel", onDialogCancel);
  }, [onDialogCancel]);

  const available = permittedKeys.filter((key) => !state.draft.includes(key));
  const MoreIcon = NAV_ICONS.more;

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
    >
      <form method="dialog" className={styles.panel} onSubmit={(e) => e.preventDefault()}>
        <header className={styles.header}>
          <h2 id={titleId}>Настройка нижней панели</h2>
          <button type="button" className={styles.closeBtn} aria-label="Закрыть" onClick={onClose}>
            ×
          </button>
        </header>

        <div className={styles.body}>
          <p className={styles.hint}>
            Выберите до 4 быстрых разделов. Если панель заполнена, выберите, какой раздел заменить.
            «Ещё» всегда остаётся последней кнопкой.
          </p>

          <div className={styles.preview} aria-label="Предпросмотр нижней панели">
            {state.draft.map((key) => (
              <span key={key} className={styles.previewItem}>
                <AgentNavIcon section={agentSectionByKey(key)} />
                <small>{agentSectionByKey(key).label}</small>
              </span>
            ))}
            <span className={styles.previewItem}>
              <MoreIcon />
              <small>Ещё</small>
            </span>
          </div>

          <div className={styles.sectionHeading}>
            <h3>На нижней панели</h3>
            <span>{state.draft.length} из 4</span>
          </div>

          <div className={styles.list}>
            {state.draft.length ? (
              state.draft.map((key, index) => (
                <div key={key} className={styles.optionRow}>
                  <label className={styles.optionLabel}>
                    <input
                      type="checkbox"
                      checked
                      onChange={() =>
                        setState((prev) => toggleMobileNavChoice(prev, key, false, permittedKeys))
                      }
                    />
                    <span>{agentSectionByKey(key).label}</span>
                  </label>
                  <div className={styles.moveBtns}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      aria-label={`Поднять ${agentSectionByKey(key).label}`}
                      disabled={index === 0}
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          draft: moveMobileNavKey(prev.draft, key, "up"),
                        }))
                      }
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      aria-label={`Опустить ${agentSectionByKey(key).label}`}
                      disabled={index === state.draft.length - 1}
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          draft: moveMobileNavKey(prev.draft, key, "down"),
                        }))
                      }
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className={styles.hint} role="status">
                Выберите хотя бы один раздел ниже.
              </p>
            )}
          </div>

          <h3 className={styles.availableTitle}>Можно добавить</h3>
          <div className={styles.list}>
            {available.length ? (
              available.map((key) => (
                <label
                  key={key}
                  className={`${styles.optionLabel} ${state.replacement === key ? styles.pending : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={state.replacement === key}
                    onChange={(event) =>
                      setState((prev) =>
                        toggleMobileNavChoice(prev, key, event.target.checked, permittedKeys),
                      )
                    }
                  />
                  <span>{agentSectionByKey(key).label}</span>
                </label>
              ))
            ) : (
              <p className={styles.hint}>Все доступные разделы уже выбраны.</p>
            )}
          </div>

          {state.replacement ? (
            <section className={styles.replacement} aria-labelledby="mobile-replacement-title">
              <h3 id="mobile-replacement-title">
                Добавить «{agentSectionByKey(state.replacement).label}»
              </h3>
              <p className={styles.hint}>
                Четыре места уже заняты. Какой раздел заменить? Остальные останутся в том же порядке.
              </p>
              <div className={styles.replaceGrid}>
                {state.draft.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={styles.replaceBtn}
                    data-testid={`mobile-replace-${key}`}
                    onClick={() =>
                      setState((prev) => applyMobileNavReplacement(prev, key))
                    }
                  >
                    <AgentNavIcon section={agentSectionByKey(key)} />
                    <span>Вместо «{agentSectionByKey(key).label}»</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={() => setState((prev) => ({ ...prev, replacement: null }))}
              >
                Не заменять
              </button>
            </section>
          ) : null}

          <button
            type="button"
            className={styles.ghostBtn}
            onClick={() =>
              setState({
                draft: defaultAgentMobileNavKeys(permittedKeys),
                replacement: null,
              })
            }
          >
            Вернуть стандартную панель
          </button>
        </div>

        <footer className={styles.footer}>
          {saveError ? (
            <p className={styles.saveError} role="alert">
              {saveError}
            </p>
          ) : null}
          <div>
          <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={saving}>
            Отмена
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={!canSaveMobileNavEditor(state) || saving}
            onClick={() => {
              if (!canSaveMobileNavEditor(state) || saving) return;
              setSaving(true);
              setSaveError(null);
              void onSave(state.draft)
                .then(() => onClose())
                .catch((error: unknown) => {
                  setSaveError(
                    error instanceof Error ? error.message : "Не удалось сохранить панель",
                  );
                })
                .finally(() => setSaving(false));
            }}
          >
            {saving ? "Сохранение…" : "Сохранить панель"}
          </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
