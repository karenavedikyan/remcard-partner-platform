import Link from "next/link";
import { IconArrowRight, IconLogOut, IconMonitorOff } from "@/components/account-session/AccountSessionIcons";
import buttonStyles from "@/components/ui/Button.module.css";
import styles from "@/components/account-session/account-session.module.css";

export const dynamic = "force-dynamic";

type SignedOutPageProps = {
  searchParams?: Promise<{ scope?: string; mode?: string }>;
};

export default async function AccountSignedOutPage(props: SignedOutPageProps) {
  const searchParams = await props.searchParams;
  const all = searchParams?.scope === "all";
  const admin = searchParams?.mode === "admin";

  return (
    <main id="main" className={styles.signedOut} tabIndex={-1} data-testid="signed-out">
      <section className={styles.signedOutPanel}>
        <span className={styles.exitIcon} aria-hidden>
          {all ? <IconMonitorOff width={28} height={28} /> : <IconLogOut width={28} height={28} />}
        </span>
        <h1>{all ? "Вы вышли на всех устройствах" : "Вы вышли из аккаунта"}</h1>
        <p className={styles.signedOutLead}>
          {all
            ? "Для продолжения работы на любом устройстве войдите снова."
            : "На этом устройстве сеанс завершён. На остальных устройствах вход сохранён."}
        </p>
        <Link
          href={admin ? "/login?mode=admin&returnTo=%2Fadmin%2Fpartners" : "/login"}
          className={`${buttonStyles.button} ${buttonStyles.primary} ${styles.profileBtn}`}
          data-testid="account-sign-in"
        >
          {admin ? "Войти в кабинет администратора" : "Войти в аккаунт"} <IconArrowRight width={18} height={18} />
        </Link>
      </section>
    </main>
  );
}
