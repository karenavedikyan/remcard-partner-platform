import Link from "next/link";

export function DoorCalculatorUnavailable() {
  return (
    <section
      style={{
        marginTop: "1.5rem",
        padding: "1.5rem",
        borderRadius: "12px",
        border: "1px solid var(--line)",
        background: "var(--surface)",
        maxWidth: "40rem",
      }}
      data-testid="door-calculator-unavailable"
      role="status"
    >
      <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.125rem" }}>Калькулятор дверей</h2>
      <p style={{ margin: 0, color: "var(--muted)" }}>Раздел недоступен для вашего профиля</p>
      <p style={{ margin: "1rem 0 0" }}>
        <Link href="/">Вернуться на главную</Link>
      </p>
    </section>
  );
}