import type { AgentR03ListSort } from "./types";

export const CLIENT_SORT_OPTIONS: Array<{ value: AgentR03ListSort; label: string }> = [
  { value: "updated_desc", label: "Сначала недавно изменённые" },
  { value: "name_asc", label: "По имени (А–Я)" },
  { value: "name_desc", label: "По имени (Я–А)" },
];

export const CERT_SORT_OPTIONS: Array<{ value: AgentR03ListSort; label: string }> = [
  { value: "updated_desc", label: "Сначала недавно изменённые" },
  { value: "created_desc", label: "Сначала новые" },
  { value: "name_asc", label: "По коду (А–Я)" },
  { value: "name_desc", label: "По коду (Я–А)" },
];

export const CERT_STATUS_FILTER_OPTIONS = [
  { value: "", label: "Все статусы" },
  { value: "ACTIVE", label: "Активен" },
  { value: "USED", label: "Использован" },
  { value: "CANCELLED", label: "Отменён" },
];
