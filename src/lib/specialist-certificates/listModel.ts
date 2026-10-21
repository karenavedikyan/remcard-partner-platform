import type { StoreCertificate } from "@/lib/certificate-types";
import type { AgentR03ListSort } from "@/lib/agent-r03/types";
import { certificateDisplayTitle } from "@/lib/certificate-url";

const ARCHIVED_STATUSES = new Set(["CANCELLED", "EXPIRED"]);

export function isStoreCertificateArchived(cert: StoreCertificate): boolean {
  return ARCHIVED_STATUSES.has(String(cert.status).toUpperCase());
}

export function filterStoreCertificates(
  items: StoreCertificate[],
  opts: {
    archived: boolean;
    q: string;
    statusFilter: string;
  },
): StoreCertificate[] {
  let out = items.filter((c) => isStoreCertificateArchived(c) === opts.archived);
  if (opts.statusFilter) {
    out = out.filter((c) => String(c.status).toUpperCase() === opts.statusFilter.toUpperCase());
  }
  const q = opts.q.trim().toLowerCase();
  if (q) {
    out = out.filter((c) => {
      const title = certificateDisplayTitle(c).toLowerCase();
      const code = (c.promoCode ?? "").toLowerCase();
      const partners = (c.storeNames ?? []).join(" ").toLowerCase();
      return title.includes(q) || code.includes(q) || partners.includes(q);
    });
  }
  return out;
}

export function sortStoreCertificates(items: StoreCertificate[], sort: AgentR03ListSort): StoreCertificate[] {
  const copy = [...items];
  copy.sort((a, b) => {
    switch (sort) {
      case "name_asc":
        return certificateDisplayTitle(a).localeCompare(certificateDisplayTitle(b), "ru");
      case "name_desc":
        return certificateDisplayTitle(b).localeCompare(certificateDisplayTitle(a), "ru");
      case "created_desc":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "updated_desc":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });
  return copy;
}

export function countActiveArchived(items: StoreCertificate[]) {
  let activeCount = 0;
  let archivedCount = 0;
  for (const c of items) {
    if (isStoreCertificateArchived(c)) archivedCount += 1;
    else activeCount += 1;
  }
  return { activeCount, archivedCount };
}
