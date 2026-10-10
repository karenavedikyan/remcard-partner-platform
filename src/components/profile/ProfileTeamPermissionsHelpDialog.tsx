"use client";

import { PROF_I_TEMPLATE_PRESETS } from "@/lib/prof-i-permissions";
import type { ProfIActionId } from "@/lib/prof-i-permissions";
import { Button } from "@/components/ui/Button";
import styles from "./ProfileTeamSection.module.css";
import wizardStyles from "./ProfileTeamPermissions.module.css";

const COMPARE_COLUMNS: { id: ProfIActionId; label: string }[] = [
  { id: "scan", label: "Сканирование" },
  { id: "sale", label: "Продажа + начисление" },
  { id: "ledger", label: "Просмотр расчётов" },
  { id: "cash", label: "Наличные" },
  { id: "transfer", label: "Перевод" },
];

const COMPARE_TEMPLATE_KEYS = ["sales", "cashier", "manager", "finance", "payout", "viewer"] as const;

type Props = {
  onClose: () => void;
};

export function ProfileTeamPermissionsHelpDialog({ onClose }: Props) {
  return (
    <div className={wizardStyles.wizardBackdrop} role="dialog" aria-modal="true" aria-labelledby="team-help-title">
      <div className={`${wizardStyles.wizardPanel} ${styles.helpDialog}`}>
        <header className={wizardStyles.wizardHead}>
          <div>
            <h3 id="team-help-title">Должности, права и выплаты</h3>
            <p className={styles.helpIntro}>
              Называйте должности так, как принято у вас. Шаблон помогает начать, а галочки определяют
              фактические права.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={onClose} aria-label="Закрыть">
            ✕
          </Button>
        </header>
        <div className={styles.helpBody}>
          <div className={wizardStyles.asideNote}>
            <strong>Начисление ≠ выплата</strong>
            <p>
              Начисление сохраняется в истории; выплата добавляется отдельной операцией. Подготовка, отказ
              или ошибка перевода не уменьшают остаток.
            </p>
            <p>
              Отметка перевода в кабинете фиксирует уже выполненный перевод — это не инициирует банковский
              платёж и не подтверждает интеграцию с банком.
            </p>
          </div>
          <div className={styles.tableScroll} tabIndex={0} aria-label="Сравнение шаблонов прав">
            <table className={styles.permTable}>
              <thead>
                <tr>
                  <th>Шаблон</th>
                  {COMPARE_COLUMNS.map((c) => (
                    <th key={c.id}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_TEMPLATE_KEYS.map((key) => {
                  const t = PROF_I_TEMPLATE_PRESETS[key];
                  return (
                    <tr key={key}>
                      <td>{t.name}</td>
                      {COMPARE_COLUMNS.map((c) => (
                        <td key={c.id} className={t.actionIds.includes(c.id) ? styles.allow : styles.deny}>
                          {t.actionIds.includes(c.id) ? "Да" : "Нет"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className={styles.proposal}>
            «Перечислять» означает право зафиксировать выполненный перевод в кабинете. Банковская интеграция,
            проверка результата и защита от повторного списания — отдельная серверная задача.
          </p>
          <div className={styles.rulebox}>
            <div>
              <span className={styles.eyebrow}>Права = что можно делать</span>
              <p>Один набор можно выдать на один магазин, несколько точек или все текущие филиалы.</p>
            </div>
            <div>
              <span className={styles.eyebrow}>Доступ = где можно работать</span>
              <p>
                Головной офис выбирается отдельно. Доступ к офису сам по себе не открывает данные всех
                филиалов.
              </p>
            </div>
          </div>
        </div>
        <footer className={wizardStyles.wizardFoot}>
          <Button type="button" onClick={onClose}>
            Понятно
          </Button>
        </footer>
      </div>
    </div>
  );
}
