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

export const longActivePartnership: Partnership = {
  ...activePartnership,
  id: "p-long-active",
  note: "Комментарий_с_очень_длинным_непрерывным_текстом_для_проверки_горизонтального_переноса_в_модальном_окне",
  listPreference: {
    personalAlias: "Мой поставщик с очень длинным названием для проверки переноса текста",
    archivedAt: null,
    hiddenAt: null,
  },
  terms: [
    {
      id: "t1",
      category: "doors",
      categoryLabel: "Двери",
      storePercent: 12,
      isExcluded: false,
      minMargin: null,
    },
    {
      id: "t2",
      category: "tiles",
      categoryLabel: "Плитка",
      storePercent: 9,
      isExcluded: false,
      minMargin: null,
    },
    {
      id: "t3",
      category: "plumbing",
      categoryLabel: "Сантехника",
      storePercent: 11,
      isExcluded: false,
      minMargin: null,
    },
    {
      id: "t4",
      category: "flooring",
      categoryLabel: "Напольные покрытия",
      storePercent: 8,
      isExcluded: false,
      minMargin: null,
    },
  ],
};
