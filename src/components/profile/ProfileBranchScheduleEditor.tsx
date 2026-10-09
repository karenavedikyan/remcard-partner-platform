"use client";

import {
  BRANCH_DAY_LABELS,
  BRANCH_DAY_ORDER,
  type BranchDayKey,
  type BranchDaySchedule,
  serializeBranchWorkingHours,
} from "@/lib/branch-working-hours";
import { TextAreaField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import styles from "./ProfileEditor.module.css";

type ProfileBranchScheduleEditorProps = {
  legacyText: string;
  days: Record<BranchDayKey, BranchDaySchedule>;
  useLegacy: boolean;
  isEmpty: boolean;
  disabled?: boolean;
  onUseLegacyChange: (legacy: boolean, text: string) => void;
  onDaysChange: (days: Record<BranchDayKey, BranchDaySchedule>) => void;
  onApplyToAllWorking: () => void;
  onStartFromTemplate: () => void;
};

export function ProfileBranchScheduleEditor({
  legacyText,
  days,
  useLegacy,
  isEmpty,
  disabled,
  onUseLegacyChange,
  onDaysChange,
  onApplyToAllWorking,
  onStartFromTemplate,
}: ProfileBranchScheduleEditorProps) {
  if (isEmpty) {
    return (
      <div className={styles.fields}>
        <p className={styles.hint}>Не указано</p>
        <Button type="button" variant="secondary" disabled={disabled} onClick={onStartFromTemplate}>
          Заполнить типовой неделей
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => onUseLegacyChange(true, "")}
        >
          Ввести текстом
        </Button>
      </div>
    );
  }

  if (useLegacy) {
    return (
      <div className={styles.fields}>
        <TextAreaField
          label="Расписание (исходный текст)"
          value={legacyText}
          onChange={(e) => onUseLegacyChange(true, e.target.value)}
          disabled={disabled}
          hint="Не удалось разобрать автоматически. Отредактируйте текст или замените сеткой."
        />
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => onUseLegacyChange(false, serializeBranchWorkingHours(days))}
        >
          Заменить сеткой дней
        </Button>
        <Button type="button" variant="secondary" disabled={disabled} onClick={onStartFromTemplate}>
          Подставить типовую неделю
        </Button>
        <p className={styles.hint}>Время указывается как местное время филиала.</p>
      </div>
    );
  }

  return (
    <div className={styles.fields}>
      <p className={styles.hint}>Местное время филиала. «Открыто сейчас» на remcard.ru не показываем без часового пояса.</p>
      <Button type="button" variant="secondary" disabled={disabled} onClick={onApplyToAllWorking}>
        Применить ко всем рабочим дням
      </Button>
      {BRANCH_DAY_ORDER.map((key) => {
        const d = days[key];
        return (
          <fieldset key={key} className={styles.fieldset}>
            <legend>{BRANCH_DAY_LABELS[key]}</legend>
            <label className={styles.hint}>
              <input
                type="checkbox"
                checked={d.closed}
                disabled={disabled}
                onChange={(e) =>
                  onDaysChange({
                    ...days,
                    [key]: { ...d, closed: e.target.checked },
                  })
                }
              />
              Выходной
            </label>
            {!d.closed ? (
              <div className={styles.fields}>
                <label>
                  с{" "}
                  <input
                    type="time"
                    value={d.open}
                    disabled={disabled}
                    onChange={(e) =>
                      onDaysChange({
                        ...days,
                        [key]: { ...d, open: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  до{" "}
                  <input
                    type="time"
                    value={d.close}
                    disabled={disabled}
                    onChange={(e) =>
                      onDaysChange({
                        ...days,
                        [key]: { ...d, close: e.target.value },
                      })
                    }
                  />
                </label>
              </div>
            ) : null}
          </fieldset>
        );
      })}
    </div>
  );
}
