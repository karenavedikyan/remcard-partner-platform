"use client";

import { useMemo } from "react";
import { SPECIALIST_PRESETS } from "@/lib/specialist-r06/presets";
import { specialistIdListDisplay } from "@/lib/specialist-r06/display-labels";
import type { SpecialistKindId } from "@/lib/specialist-r06/types";
import styles from "./SpecialistPresetSection.module.css";
import wizardStyles from "../agent/AgentProfileWizard.module.css";

type Props = {
  specialistKind: SpecialistKindId | "" | undefined;
  specialistTitle?: string;
  notice?: string;
  disabled?: boolean;
  selectId?: string;
  onKindChange: (kind: SpecialistKindId | "") => void;
  onTitleChange?: (title: string) => void;
  onApplyMerge: () => void;
  /** Working profile draft persists specialistTitle; catalog has no API field — UI-only preset. */
  persistCustomTitle?: boolean;
  /** Default catalog/agent styling; workingProfile enables scoped visual variant. */
  presentationVariant?: "default" | "workingProfile";
};

export function SpecialistPresetSection({
  specialistKind,
  specialistTitle = "",
  notice = "",
  disabled,
  selectId = "sp-kind",
  onKindChange,
  onTitleChange,
  onApplyMerge,
  persistCustomTitle = true,
  presentationVariant = "default",
}: Props) {
  const preset = useMemo(
    () => SPECIALIST_PRESETS.find((p) => p.id === specialistKind),
    [specialistKind],
  );

  return (
    <section
      className={
        presentationVariant === "workingProfile"
          ? `${styles.section} ${styles.workingProfile}`
          : styles.section
      }
      data-testid="specialist-preset-section"
      data-preset-variant={presentationVariant}
    >
      <div className={styles.field}>
        <label htmlFor={selectId}>Кто вы как специалист?</label>
        <select
          id={selectId}
          data-specialist-kind
          disabled={disabled}
          value={specialistKind ?? ""}
          onChange={(e) => onKindChange(e.target.value as SpecialistKindId | "")}
        >
          <option value="">Выберите роль или заполните вручную</option>
          {SPECIALIST_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <p className={styles.hint}>
        При первом выборе роли в пустой форме подставим стартовые категории и этапы. Это подсказка,
        не ограничение: удалите лишнее, добавьте нужное или свой вариант.
      </p>
      {specialistKind === "other" ? (
        persistCustomTitle ? (
          <>
            <div className={styles.field}>
              <label htmlFor={`${selectId}-title`}>Ваша специализация</label>
              <input
                id={`${selectId}-title`}
                maxLength={80}
                disabled={disabled}
                value={specialistTitle}
                placeholder="Например, реставратор"
                onChange={(e) => onTitleChange?.(e.target.value)}
              />
            </div>
            <p className={styles.hint}>Для своего варианта выберите категории и этапы вручную.</p>
          </>
        ) : (
          <p className={styles.hint} data-testid="specialist-preset-custom-title-blocked">
            Свой вариант: выберите категории и этапы вручную ниже. Отдельное название роли в
            черновике каталога не сохраняется (контракт BLOCKED).
          </p>
        )
      ) : null}
      {preset && preset.id !== "other" ? (
        <details className={styles.presetPreview}>
          <summary>Стартовый набор для роли «{preset.label}»</summary>
          <div className={styles.presetContent}>
            {preset.note ? <small className={styles.hint}>{preset.note}</small> : null}
            <div className={styles.chips}>
              {preset.serviceIds.map((id) => (
                <span key={`s-${id}`} className={styles.chip}>
                  Категория: {specialistIdListDisplay([id])}
                </span>
              ))}
              {preset.stageIds.map((id) => (
                <span key={`st-${id}`} className={styles.chip}>
                  Этап: {specialistIdListDisplay([id])}
                </span>
              ))}
            </div>
            <button
              type="button"
              className={`${wizardStyles.btn} ${styles.applyBtn}`}
              data-specialist-apply=""
              disabled={disabled}
              onClick={onApplyMerge}
            >
              Добавить этот набор к выбранному
            </button>
            <small className={styles.hint}>Уже выбранные категории и этапы сохранятся.</small>
          </div>
        </details>
      ) : null}
      {notice ? (
        <p className={styles.status} role="status" data-specialist-status="">
          {notice}
        </p>
      ) : null}
    </section>
  );
}
