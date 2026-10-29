import type { Partnership } from "@/lib/types";

export const storeMeId = "store-harness";

export const incomingEmptyAgent: Partnership = {
  id: "p-incoming-agent",
  status: "INVITED",
  initiatedBy: "agent-harness",
  pendingProposedBy: null,
  note: null,
  createdAt: "",
  updatedAt: "",
  storeUserId: storeMeId,
  proUserId: "agent-harness",
  terms: [],
  storeUser: {
    id: storeMeId,
    displayName: "Магазин Юг",
    city: "Краснодар",
    specializations: [],
    storeCategories: ["doors"],
    partnerType: "STORE",
  },
  proUser: {
    id: "agent-harness",
    displayName: "Seda Rallis",
    city: "Краснодар",
    specializations: [],
    storeCategories: [],
    partnerType: "COMPANY",
    partnerActivities: ["AGENT"],
  },
};

export const incomingWithTerms: Partnership = {
  ...incomingEmptyAgent,
  id: "p-incoming-terms",
  initiatedBy: storeMeId,
  terms: [
    {
      id: "t1",
      category: "doors",
      categoryLabel: "Двери",
      storePercent: 10,
      isExcluded: false,
      minMargin: null,
    },
  ],
};

export const pendingResponder: Partnership = {
  ...incomingEmptyAgent,
  id: "p-pending",
  status: "PENDING",
  initiatedBy: storeMeId,
  pendingProposedBy: "agent-harness",
  terms: [
    {
      id: "t1",
      category: "doors",
      categoryLabel: "Двери",
      storePercent: 15,
      isExcluded: false,
      minMargin: null,
    },
  ],
};

export const activePartnership: Partnership = {
  ...incomingEmptyAgent,
  id: "p-active",
  status: "ACTIVE",
  initiatedBy: storeMeId,
  terms: [
    {
      id: "t1",
      category: "doors",
      categoryLabel: "Двери",
      storePercent: 12,
      isExcluded: false,
      minMargin: null,
    },
  ],
};
