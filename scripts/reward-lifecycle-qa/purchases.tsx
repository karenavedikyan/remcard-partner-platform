import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AgentCertificateDetail } from "../../src/components/agent-r03/AgentCertificateDetail";
import { SpecialistCertificateDetailDialog } from "../../src/components/specialist-certificates/SpecialistCertificateDetailDialog";
import { AgentCertificateCard } from "../../src/components/agent-r03/AgentCertificateCard";
import { AgentR03MobileCertRow } from "../../src/components/agent-r03/AgentR03MobileCertRow";
import { CertificatePurchaseLink } from "../../src/components/agent-r03/CertificatePurchaseLink";
import { PurchaseDetail } from "../../src/components/history/PurchaseDetail";
import type { AuthUser } from "../../src/lib/types";
import { cert, meta } from "./purchase-fixtures";
import "../../src/app/globals.css";

const originalFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  if (typeof input === "string" && input.startsWith("/api/remcard/api/store/orders/")) {
    const role = document.querySelector("select")?.value ?? "AGENT";
    return originalFetch(`${input}?qaRole=${role}`, init);
  }
  return originalFetch(input, init);
};

function App() {
  const [kind, setKind] = useState("AGENT");
  const [view, setView] = useState("list");
  const [orderId, setOrderId] = useState(cert.orders![0].id);
  useEffect(() => {
    function navigate(e: MouseEvent) {
      const a = (e.target as Element).closest("a");
      if (!a) return;
      const url = new URL(a.href);
      if (url.origin !== location.origin) { e.preventDefault(); return; }
      e.preventDefault();
      if (url.pathname.startsWith("/history/purchases/")) {
        setOrderId(url.pathname.split("/").at(-1)!); setView("purchase");
      } else if (/^\/(certificates|recommendations)\//.test(url.pathname)) {
        history.replaceState({}, "", `/purchases.html#certificate-purchases`); setView("detail");
      } else setView("list");
    }
    document.addEventListener("click", navigate, true);
    return () => document.removeEventListener("click", navigate, true);
  }, []);
  const props = { cert: meta, selected: false, onSelectChange: () => {}, actions: [],
    detailBasePath: kind === "AGENT" ? "/certificates" : "/recommendations" };
  return <main style={{ maxWidth: 1100, margin: "auto", padding: 20 }}>
    <p>Изолированная проверка. Все данные синтетические.</p>
    <label>Тип партнёра <select aria-label="Тип партнёра" value={kind} onChange={e => { setKind(e.target.value); setView("list"); }}>
      {["AGENT", "SPECIALIST", "STORE", "COMPANY"].map(k => <option key={k}>{k}</option>)}</select></label>
    <button onClick={() => setView("list")}>К списку проверки</button>
    <button onClick={() => { document.documentElement.dataset.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; }}>Сменить тему</button>
    {view === "list" ? <>
      <h1>Сертификаты</h1><div data-testid="desktop-list"><CertificatePurchaseLink cert={meta} detailBasePath={props.detailBasePath} /></div>
      <AgentCertificateCard {...props} archived={false} /><AgentR03MobileCertRow {...props} />
    </> : view === "detail" ? kind === "AGENT"
      ? <AgentCertificateDetail certificateId={cert.id} />
      : <SpecialistCertificateDetailDialog open certificateId={cert.id}
          issuerListApi={kind === "SPECIALIST" ? "specialist" : "business"} onClose={() => setView("list")} />
      : <PurchaseDetail user={{ id: "qa-only-user" } as AuthUser} purchaseId={orderId} promoHint={cert.promoCode} />}
  </main>;
}
createRoot(document.getElementById("root")!).render(<App />);
