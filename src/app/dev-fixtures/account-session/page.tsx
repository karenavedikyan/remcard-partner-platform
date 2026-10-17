"use client";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { AccountSessionMenu } from "@/components/account-session/AccountSessionMenu";
import { ProfileSessionActions } from "@/components/account-session/ProfileSessionActions";
import styles from "@/components/account-session/account-session.module.css";

export default function AccountSessionFixturePage() {
  return (
    <ThemeProvider>
      <div style={{ minHeight: "100dvh", background: "var(--bg, #f6f5f3)", padding: "1rem" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "0.5rem",
            minHeight: 86,
            padding: "16px 32px",
            background: "var(--surface, #fff)",
            borderBottom: "1px solid var(--line, #dedfd9)",
          }}
          data-testid="account-session-fixture-topbar"
        >
          <AccountSessionMenu displayName="Анна Смирнова" roleLabel="Агент" />
        </header>
        <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
          <ProfileSessionActions />
          <section className={styles.signedOutPanel} style={{ marginTop: "2rem" }} data-testid="signed-out-preview">
            <h1>Вы вышли из аккаунта</h1>
            <p className={styles.signedOutLead}>Предпросмотр экрана после выхода.</p>
          </section>
        </main>
      </div>
    </ThemeProvider>
  );
}
