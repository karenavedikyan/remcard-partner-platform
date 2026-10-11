import styles from "./ProfileTeamPermissions.module.css";

/** Prototype team-flex money-flow illustration (example amounts only). */
export function TeamBonusIllustration({ compact }: { compact?: boolean }) {
  return (
    <div className={styles.bonusNote} data-testid="team-bonus-illustration">
      <div className={styles.bonusHead}>
        <strong>Начисление ≠ выплата</strong>
      </div>
      <div className={styles.moneyFlow}>
        <div>
          <small>Продажа (пример)</small>
          <strong>+1 000 ₽</strong>
          <span>Начислено партнёру</span>
        </div>
        <div>
          <small>Успешная выплата (пример)</small>
          <strong>−600 ₽</strong>
          <span>Погашено обязательство</span>
        </div>
        <div>
          <small>Остаток (пример)</small>
          <strong>400 ₽</strong>
          <span>Ещё нужно выплатить</span>
        </div>
      </div>
      <p className={styles.bonusCopy}>
        Иллюстрация. Начисление сохраняется в истории; выплата добавляется отдельной операцией.
      </p>
      {!compact ? (
        <>
          <p className={styles.bonusCopy}>
            Запись выплаты в кабинете использует серверную идемпотентность BonusPayoutRecord — повторное
            списание по той же операции блокируется. Это не инициирует банковский перевод и не подтверждает
            интеграцию с банком.
          </p>
          <p className={styles.ownerNote}>
            Название должности не выдаёт права. Управление владельцем, банковскими реквизитами и удаление
            организации не входят ни в один набор.
          </p>
        </>
      ) : null}
    </div>
  );
}
