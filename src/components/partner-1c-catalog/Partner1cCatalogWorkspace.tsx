"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { FULL_SNAPSHOT, SELLER_NAME } from "@/lib/partner-1c-catalog/constants";
import { blank } from "@/lib/partner-1c-catalog/lk";
import { modelIssues, type PublicationState } from "@/lib/partner-1c-catalog/models";
import { clonePublication } from "./publication";
import type { PartnerCatalogSnapshot } from "@/lib/partner-1c-catalog/api";
import { DOORS_CALCULATOR_HREF } from "@/lib/door-calculator/access";
import { num } from "@/lib/partner-1c-catalog/text";
import { PcIconCalc, PcIconInfo } from "./Partner1cIcons";
import { Partner1cItemsTab, type ItemsUiState } from "./Partner1cItemsTab";
import { Partner1cModelDetail } from "./Partner1cModelDetail";
import { Partner1cSitePreviewTab } from "./Partner1cSitePreviewTab";
import styles from "./Partner1cCatalog.module.css";

type Tab = "items" | "site";

type Props = {
  snapshot: PartnerCatalogSnapshot;
};

const initialUi = (): ItemsUiState => ({
  q: "",
  sectionPath: "",
  status: "",
  branch: "",
  low: false,
  f: blank(),
  selected: new Set(),
  layout: "list",
  full: false,
  showCost: true,
});

export function Partner1cCatalogWorkspace({ snapshot }: Props) {
  const [tab, setTab] = useState<Tab>("items");
  const [publication, setPublication] = useState<PublicationState>(() =>
    clonePublication(snapshot.publication),
  );
  const [viewId, setViewId] = useState("");
  const [ui, setUi] = useState<ItemsUiState>(() => ({
    ...initialUi(),
    showCost: snapshot.manage,
  }));

  const model = useMemo(
    () => snapshot.models.find((m) => m.id === viewId) ?? null,
    [snapshot.models, viewId],
  );

  const toggleHidden = useCallback(
    (id: string) => {
      const m = snapshot.models.find((x) => x.id === id);
      if (!m || modelIssues(m).length) return;
      setPublication((pub) => {
        const next = clonePublication(pub);
        if (next.hidden.has(id)) next.hidden.delete(id);
        else next.hidden.add(id);
        return next;
      });
    },
    [snapshot.models],
  );

  const filterForDetail = useMemo(() => {
    const st = { ...ui.f, q: ui.q, ...parseSection(ui.sectionPath) };
    return st;
  }, [ui]);

  return (
    <div
      className={`stack pc-section ${ui.full && tab === "items" ? "is-full" : ""} ${styles.catalogScope}`}
      data-testid="product-catalog-section"
    >
      <p className="notice pc-demo">
        <PcIconInfo />
        <span>
          Пример: каталог партнёра «{SELLER_NAME}» из 1С. В прототипе показана выборка из{" "}
          {num(FULL_SNAPSHOT.positions)} позиций; данные демонстрационные.
        </span>
      </p>
      <div className="pc-tabrow">
        <div className="tabs proc-tabs pc-tabs" role="tablist">
          <button
            type="button"
            className={tab === "items" ? "selected" : ""}
            data-testid="pc-tab-items"
            role="tab"
            aria-selected={tab === "items"}
            onClick={() => {
              setTab("items");
              setViewId("");
            }}
          >
            Товары
          </button>
          <button
            type="button"
            className={tab === "site" ? "selected" : ""}
            data-testid="pc-tab-site"
            role="tab"
            aria-selected={tab === "site"}
            onClick={() => {
              setTab("site");
              setViewId("");
            }}
          >
            Вид на сайте
          </button>
        </div>
        <Link className="pc-calcbtn" href={DOORS_CALCULATOR_HREF} data-testid="pc-door-calc-global">
          <PcIconCalc />
          <span>Калькулятор дверей</span>
        </Link>
      </div>

      {viewId && model ? (
        <Partner1cModelDetail
          model={model}
          publication={publication}
          manage={snapshot.manage}
          showCost={ui.showCost}
          priceType={snapshot.priceType}
          filter={filterForDetail}
          onBack={() => setViewId("")}
          onPublication={setPublication}
          onToggleHidden={() => toggleHidden(model.id)}
        />
      ) : tab === "site" ? (
        <Partner1cSitePreviewTab models={snapshot.models} publication={publication} />
      ) : (
        <Partner1cItemsTab
          models={snapshot.models}
          publication={publication}
          manage={snapshot.manage}
          priceType={snapshot.priceType}
          access={snapshot.access}
          ui={ui}
          onUi={setUi}
          onPublication={setPublication}
          onOpenModel={setViewId}
        />
      )}
    </div>
  );
}

function parseSection(v: string) {
  const [section, group = ""] = String(v || "").split("/");
  return { section, group };
}