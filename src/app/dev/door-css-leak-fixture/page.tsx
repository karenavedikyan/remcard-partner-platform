import { notFound } from "next/navigation";
import { DoorCssLeakFixtureClient } from "./DoorCssLeakFixtureClient";

export default function DoorCssLeakFixturePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main>
      <header style={{ padding: "12px 16px 0", margin: 0 }}>
        <p style={{ margin: 0, fontSize: 13, color: "#6c706a" }}>
          Dev only: AgentPartnerCollection (list / mobileRecord) для проверки утечки CSS калькулятора
        </p>
      </header>
      <DoorCssLeakFixtureClient />
    </main>
  );
}