import { formatMoneyRub } from "@/lib/history-format";

export function formatKopecks(kopecks: number): string {
  return formatMoneyRub(Math.round(kopecks) / 100);
}
