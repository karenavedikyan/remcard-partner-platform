"use client";

import { useCallback, useState } from "react";
import { AgentPartnerCollection } from "@/components/partners/AgentPartnerCollection";
import type { Partnership } from "@/lib/types";

const ME = "u-fixture-partners";

function fixturePartnership(id: string, name: string): Partnership {
  return {
    id,
    status: "ACTIVE",
    initiatedBy: ME,
    pendingProposedBy: null,
    note: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    storeUserId: `store-${id}`,
    proUserId: ME,
    terms: [
      {
        id: `t-${id}`,
        category: "doors",
        categoryLabel: "Двери",
        storePercent: 12,
        isExcluded: false,
        minMargin: null,
      },
    ],
    storeUser: {
      id: `store-${id}`,
      displayName: name,
      city: "Краснодар",
      specializations: [],
      storeCategories: ["doors"],
      partnerType: "STORE",
    },
    proUser: {
      id: ME,
      displayName: "Алексей Петров",
      city: "Краснодар",
      specializations: [],
      storeCategories: ["doors"],
      partnerType: "STORE",
    },
    listPreference: { personalAlias: null, archivedAt: null, hiddenAt: null },
    directionInfo: {
      direction: "outgoing",
      issuerUserId: ME,
      receiverUserId: `store-${id}`,
      legacyInverted: false,
      counterpartyUserId: `store-${id}`,
      reversePartnershipId: null,
      reverseStatus: null,
    },
  } as Partnership;
}

const PARTNERSHIPS = [
  fixturePartnership("south-doors", "Магазин Двери Юг"),
  fixturePartnership("north-doors", "Салон Дверной Мир"),
];

const noop = () => {};

export function DoorCssLeakFixtureClient() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const onToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <div
      data-testid="door-css-leak-fixture-root"
      style={{
        boxSizing: "border-box",
        width: "100%",
        maxWidth: 1310,
        minWidth: 0,
        margin: "0 auto",
        padding: "16px",
      }}
    >
      <AgentPartnerCollection
        meId={ME}
        partnerships={PARTNERSHIPS}
        viewMode="list"
        busyId={null}
        onRunAction={noop}
        onUpdated={noop}
        termRequests={{}}
        onLoadTermRequests={noop}
        expandedTermPartnershipId={null}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        onToggleSelectAll={noop}
        page={0}
        pageSize={10}
        totalCount={PARTNERSHIPS.length}
        onPageChange={noop}
        onPageSizeChange={noop}
        directionAudience="business-store-r04"
        detailDirectionAudience="business-store-r04"
      />
    </div>
  );
}