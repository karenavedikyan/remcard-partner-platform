import Link from "next/link";
import { Button } from "@/components/ui/Button";
import buttonStyles from "@/components/ui/Button.module.css";
import promptStyles from "./InviteAcceptedProfilePrompt.module.css";
import styles from "./InviteLanding.module.css";

type Props = {
  variant: "partnership" | "discussion";
  profileHref: string;
  continueHref: string;
  checkError?: string;
  checking?: boolean;
  onRetryCheck?: () => void;
  showContinueAnyway?: boolean;
};

export function InviteAcceptedProfilePrompt({
  variant,
  profileHref,
  continueHref,
  checkError,
  checking,
  onRetryCheck,
  showContinueAnyway = true,
}: Props) {
  const acceptedTitle =
    variant === "discussion" ? "Вы присоединились к обсуждению" : "Приглашение принято";
  const lead =
    variant === "discussion"
      ? "Присоединение сохранено. Это не согласование коммерческих условий — только доступ к обсуждению. Чтобы связанные функции в кабинете работали, проверьте обязательные данные профиля для вашего текущего типа партнёра."
      : "Принятие условий сохранено. Чтобы партнёрство и связанные функции в кабинете работали, проверьте обязательные данные профиля для вашего текущего типа партнёра.";

  return (
    <section className={styles.card} data-testid="invite-accepted-profile-prompt">
      <h1 className={styles.title}>{acceptedTitle}</h1>
      <p className={styles.lead}>{lead}</p>
      {checking ? (
        <p className={styles.meta} role="status" data-testid="invite-accept-profile-checking">
          Проверяем данные профиля…
        </p>
      ) : null}
      {checkError ? (
        <p className={styles.error} role="alert" data-testid="invite-accept-profile-check-error">
          {checkError} Можно повторить проверку или открыть профиль — принятие не отменяется.
        </p>
      ) : null}
      <div className={styles.actions}>
        <Link
          href={profileHref}
          className={`${buttonStyles.button} ${buttonStyles.primary}`}
          data-testid="invite-accept-profile-complete-link"
        >
          Заполнить данные профиля
        </Link>
        {onRetryCheck ? (
          <Button
            type="button"
            variant="secondary"
            className={promptStyles.retryButton}
            disabled={checking}
            data-testid="invite-accept-profile-check-retry"
            onClick={() => onRetryCheck()}
          >
            {checking ? "Проверяем…" : "Повторить проверку"}
          </Button>
        ) : null}
        {showContinueAnyway ? (
          <Link
            href={continueHref}
            className={`${buttonStyles.button} ${buttonStyles.secondary}`}
            data-testid="invite-accept-continue-link"
          >
            Перейти дальше
          </Link>
        ) : null}
      </div>
    </section>
  );
}
