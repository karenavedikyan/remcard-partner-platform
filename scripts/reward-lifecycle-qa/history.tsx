import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { HistoryHub } from "../../src/components/history/HistoryHub";
import { AccrualDetail } from "../../src/components/history/AccrualDetail";
import { PurchaseDetail } from "../../src/components/history/PurchaseDetail";
import type { AccrualType } from "../../src/lib/history-types";
import type { AuthUser } from "../../src/lib/types";
import { QA_SCENES } from "./history-fixtures";
import { cert } from "./purchase-fixtures";
import "../../src/app/globals.css";

type Route =
  | { view: "hub"; search?: string }
  | { view: "accrual"; accrualId: string; accrualType?: AccrualType }
  | { view: "purchase"; purchaseId: string };

const qaUser = { id: "qa-history-user", role: "PRO", partnerType: "STORE", displayName: "QA" } as AuthUser;

function parseAccrualType(raw: string | null): AccrualType | undefined {
  return raw === "bonus" || raw === "agentBonus" ? raw : undefined;
}

function parseRoute(): Route {
  const raw = window.location.hash.replace(/^#/, "") || "/history";
  const url = new URL(raw, "http://127.0.0.1");
  if (url.pathname.startsWith("/history/accruals/")) {
    const accrualId = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");
    return {
      view: "accrual",
      accrualId,
      accrualType: parseAccrualType(url.searchParams.get("type")),
    };
  }
  if (url.pathname.startsWith("/history/purchases/")) {
    return { view: "purchase", purchaseId: decodeURIComponent(url.pathname.split("/").at(-1) ?? "") };
  }
  return { view: "hub", search: url.searchParams.get("search") ?? undefined };
}

function routeToHash(route: Route): string {
  if (route.view === "hub") {
    const q = route.search ? `?search=${encodeURIComponent(route.search)}` : "";
    return `#/history${q}`;
  }
  if (route.view === "accrual") {
    const q = route.accrualType ? `?type=${encodeURIComponent(route.accrualType)}` : "";
    return `#/history/accruals/${encodeURIComponent(route.accrualId)}${q}`;
  }
  return `#/history/purchases/${encodeURIComponent(route.purchaseId)}`;
}

function App() {
  const [scene, setScene] = useState(QA_SCENES[0]!.id);
  const [route, setRoute] = useState<Route>(() => parseRoute());

  const syncRoute = useCallback(() => {
    setRoute(parseRoute());
  }, []);

  useEffect(() => {
    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, [syncRoute]);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      let href = typeof input === "string" ? input : input instanceof Request ? input.url : input.href;
      if (href.startsWith("/api/remcard/")) {
        const url = new URL(href, window.location.origin);
        if (!url.searchParams.has("qaScene")) {
          url.searchParams.set("qaScene", scene);
          href = url.pathname + url.search;
        }
        if (typeof input === "string") {
          return originalFetch(href, init);
        }
        return originalFetch(new Request(href, input), init);
      }
      return originalFetch(input, init);
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [scene]);

  useEffect(() => {
    function onNavigate(event: MouseEvent) {
      const target = event.target as Element | null;
      const anchor = target?.closest("a");
      if (!anchor || anchor.origin !== window.location.origin) {
        return;
      }
      const path = anchor.pathname;
      if (
        !path.startsWith("/history") &&
        !path.startsWith("/history.html")
      ) {
        return;
      }
      event.preventDefault();
      const url = new URL(anchor.href);
      if (path.startsWith("/history/accruals/")) {
        const accrualId = decodeURIComponent(path.split("/").at(-1) ?? "");
        const next: Route = {
          view: "accrual",
          accrualId,
          accrualType: parseAccrualType(url.searchParams.get("type")),
        };
        window.location.hash = routeToHash(next);
        setRoute(next);
        return;
      }
      if (path.startsWith("/history/purchases/")) {
        const next: Route = {
          view: "purchase",
          purchaseId: decodeURIComponent(path.split("/").at(-1) ?? ""),
        };
        window.location.hash = routeToHash(next);
        setRoute(next);
        return;
      }
      const next: Route = { view: "hub", search: url.searchParams.get("search") ?? undefined };
      window.location.hash = routeToHash(next);
      setRoute(next);
    }
    document.addEventListener("click", onNavigate, true);
    return () => document.removeEventListener("click", onNavigate, true);
  }, []);

  const sceneOptions = useMemo(() => QA_SCENES, []);

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "16px 20px 32px" }}>
      <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
        Изолированная проверка HistoryHub / AccrualDetail / PurchaseDetail. Только синтетические GET;
        мутации заблокированы.
      </p>
      <form
        onSubmit={(event) => event.preventDefault()}
        style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 16 }}
      >
        <label style={{ fontSize: 13 }}>
          Сцена{" "}
          <select
            id="qa-scene"
            aria-label="Сцена"
            value={scene}
            onChange={(event) => {
              setScene(event.target.value);
              setRoute({ view: "hub" });
              window.location.hash = "#/history";
            }}
          >
            {sceneOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          style={{ minHeight: 44, minWidth: 44, padding: "8px 12px" }}
          onClick={() => {
            document.documentElement.dataset.theme =
              document.documentElement.dataset.theme === "dark" ? "light" : "dark";
          }}
        >
          Сменить тему
        </button>
        <button
          type="button"
          style={{ minHeight: 44, padding: "8px 12px" }}
          onClick={() => {
            const next: Route = { view: "hub" };
            window.location.hash = routeToHash(next);
            setRoute(next);
          }}
        >
          К истории
        </button>
        <button
          type="button"
          style={{ minHeight: 44, padding: "8px 12px" }}
          onClick={() => {
            const next: Route = {
              view: "purchase",
              purchaseId: cert.orders![0]!.id,
            };
            window.location.hash = routeToHash(next);
            setRoute(next);
          }}
        >
          Покупка (focus)
        </button>
      </form>

      {route.view === "hub" ? (
        <HistoryHub
          key={scene}
          user={qaUser}
          initialPromoCode={route.search ?? ""}
        />
      ) : null}
      {route.view === "accrual" ? (
        <AccrualDetail
          key={`${scene}:${route.accrualId}:${route.accrualType ?? ""}`}
          user={qaUser}
          accrualId={route.accrualId}
          accrualType={route.accrualType}
        />
      ) : null}
      {route.view === "purchase" ? (
        <PurchaseDetail
          key={`${scene}:${route.purchaseId}`}
          user={qaUser}
          purchaseId={route.purchaseId}
          promoHint={cert.promoCode}
        />
      ) : null}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
