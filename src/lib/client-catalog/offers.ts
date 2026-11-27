import { BRANCHES } from "@/lib/partner-1c-catalog/constants";
import { hash, num, plural, rub } from "@/lib/partner-1c-catalog/text";
import type { CatalogProductRaw } from "@/lib/partner-1c-catalog/types";

const HOME = "s6";
const MAKER_NAME = "Тандор";

export type OfferRow = {
  key: string;
  sellerId: string;
  sellerName: string;
  city: string;
  addr: string;
  price: number;
  avail: string;
  demo?: boolean;
};

function round10(n: number) {
  return Math.max(10, Math.round(n / 10) * 10);
}

function shift(p: CatalogProductRaw, key: string, lo: number, hi: number, own: boolean) {
  const base = own ? p.price : p.price;
  if (base == null) return 0;
  return round10(base * (1 + (lo + (hash(`${key}:${p.id}`) % (hi - lo + 1))) / 100));
}

const AV: Record<string, string> = {
  in: "В наличии",
  soon: "Скоро поступит",
  order: "Под заказ",
};

export function catalogOffers(p: CatalogProductRaw): OfferRow[] {
  if (p.seller !== HOME || p.price == null) return [];
  const own = AV[p.avail] || AV.order;
  return [
    {
      key: HOME,
      sellerId: HOME,
      sellerName: "Оптовик",
      city: "Краснодар",
      addr: "Ростовское шоссе, 30/3 и ещё 4 филиала",
      price: p.price,
      avail: own!,
    },
    {
      key: `${HOME}-nvr`,
      sellerId: HOME,
      sellerName: "Оптовик",
      city: "Новороссийск",
      addr: BRANCHES[5]!,
      price: shift(p, "nvr", 2, 4, true),
      avail: p.avail === "in" ? "Под заказ · 2–3 дня" : own!,
    },
    {
      key: "dx1",
      sellerId: "dx1",
      sellerName: "Салон дверей в Сочи",
      city: "Сочи",
      addr: "адрес — в заявке",
      price: shift(p, "dx1", 3, 7, false),
      avail: "Под заказ · 5–7 дней",
      demo: true,
    },
    {
      key: "dx2",
      sellerId: "dx2",
      sellerName: "Салон дверей в Ростове-на-Дону",
      city: "Ростов-на-Дону",
      addr: "адрес — в заявке",
      price: shift(p, "dx2", -1, 5, false),
      avail: "Под заказ · 4–6 дней",
      demo: true,
    },
  ];
}

export function offersSummary(rows: OfferRow[]) {
  const sellers = new Set(rows.map((o) => o.sellerId)).size;
  const cities = [...new Set(rows.map((o) => o.city))];
  return { sellers, cities, maker: MAKER_NAME, plural, num, rub };
}