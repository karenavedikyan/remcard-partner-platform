import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ScannerHub } from "@/components/scanner/ScannerHub";
import { SettlementsHub } from "@/components/settlements/SettlementsHub";
import { AgentReceivablesHub } from "@/components/agent-r05/AgentReceivablesHub";
import { RewardLifecyclePanel } from "@/components/settlements/RewardLifecyclePanel";
import "../../src/app/globals.css";
const orderId = "caaaaaaaaaaaaaaaaaaaaaaaa";
const qaAuthUser = { id: "qa-reward", role: "PRO" as const, partnerType: null, displayName: "QA" };
function App() {
  const [view, setView] = useState("scanner");
  const [recipient, setRecipient] = useState(false);
  const [revision, setRevision] = useState(0);
  return <main style={{ maxWidth: 1100, margin: "0 auto", padding: "var(--space-4)" }}>
    <p>Изолированная проверка. Только синтетические данные.</p>
    <nav style={{ display: "flex", flexWrap: "wrap", gap: 12, margin: "20px 0" }}>
      {[["scanner", "Сканер"], ["wallet", "Кошелёк продавца"], ["agent", "Кошелёк агента"], ["details", "Условия покупки"]].map(([key, label]) =>
        <button key={key} onClick={() => setView(key)}>{label}</button>)}
      <button onClick={() => { document.documentElement.dataset.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; }}>Сменить тему</button>
      <button onClick={async () => { await fetch("/api/qa/advance", { method: "POST" }); setRevision(r => r + 1); }}>Тест: наступление сроков</button>
      <button onClick={() => { document.cookie = `qa-recipient=${recipient ? "0" : "1"}; Path=/`; setRecipient(!recipient); setRevision(r => r + 1); }}>
        {recipient ? "Перейти к продавцу" : "Перейти к получателю"}
      </button>
    </nav>
    <div key={`${view}-${revision}`}>
      {view === "scanner" ? <ScannerHub userId="qa-payer" /> : view === "wallet" ? <SettlementsHub user={qaAuthUser} />
        : view === "agent" ? <AgentReceivablesHub /> : <RewardLifecyclePanel orderId={orderId} />}
    </div>
  </main>;
}
createRoot(document.getElementById("root")!).render(<App />);
