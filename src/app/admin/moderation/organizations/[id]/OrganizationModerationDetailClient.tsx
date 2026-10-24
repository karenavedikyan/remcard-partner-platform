"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RemcardApiError } from "@/lib/api-client";
import {
  fetchModerationOrganization,
  moderationBranchAction,
  moderationOrganizationAction,
} from "@/lib/prof-admin-moderation-api";

type BranchRow = {
  id: string;
  catalogStatus: string;
  submitted: { name?: string; city?: string; address?: string; photoUrl?: string | null };
  hasSubmittedDiff: boolean;
};

type OrgPayload = {
  id: string;
  name: string;
  partnerType: string;
  catalogStatus: string;
  isTestPartner: boolean;
  submitted: { description?: string | null; logoUrl?: string | null };
  branches: BranchRow[];
};

export function OrganizationModerationDetailClient({ organizationId }: { organizationId: string }) {
  const searchParams = useSearchParams();
  const focusBranch = searchParams.get("branch");
  const [org, setOrg] = useState<OrgPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reviseComment, setReviseComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchModerationOrganization(organizationId);
      setOrg(res.organization as OrgPayload);
    } catch (e) {
      setOrg(null);
      setError(e instanceof RemcardApiError ? e.message : "Ошибка загрузки");
    }
    setLoading(false);
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const focusedBranch = useMemo(
    () => org?.branches.find((b) => b.id === focusBranch) ?? null,
    [org, focusBranch],
  );

  const orgAction = async (action: "approve-all" | "reject" | "revise") => {
    if (busy) return;
    if (!window.confirm(`Подтвердите: ${action}`)) return;
    setBusy(true);
    const body =
      action === "revise"
        ? { comment: reviseComment.trim() }
        : action === "reject"
          ? { reason: rejectReason.trim() }
          : {};
    try {
      await moderationOrganizationAction(organizationId, action, body);
      setMessage("Готово.");
      await load();
    } catch (e) {
      setMessage(e instanceof RemcardApiError ? e.message : "Ошибка");
    }
    setBusy(false);
  };

  const branchAction = async (branchId: string, action: "approve" | "reject" | "revise") => {
    if (busy || !window.confirm(`Филиал: ${action}?`)) return;
    setBusy(true);
    const body = action === "revise" ? { comment: reviseComment.trim() } : {};
    try {
      await moderationBranchAction(branchId, action, body);
      setMessage("Филиал обновлён.");
      await load();
    } catch (e) {
      setMessage(e instanceof RemcardApiError ? e.message : "Ошибка");
    }
    setBusy(false);
  };

  if (loading) return <p>Загрузка…</p>;
  if (error) return <p role="alert">{error}</p>;
  if (!org) return <p>Не найдено</p>;

  return (
    <div>
      <p>
        <Link href="/admin/moderation">← Очередь</Link>
      </p>
      <h1>{org.name}</h1>
      <p>
        {org.partnerType} · {org.catalogStatus}
        {org.isTestPartner ? " · TEST" : ""}
      </p>
      {org.submitted.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={org.submitted.logoUrl} alt="" style={{ maxWidth: 160, marginBottom: 12 }} />
      ) : null}
      <p>{org.submitted.description ?? "—"}</p>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: "1rem" }}>Организация</h2>
        <button type="button" disabled={busy} onClick={() => void orgAction("approve-all")}>
          Одобрить организацию
        </button>{" "}
        <button type="button" disabled={busy} onClick={() => void orgAction("reject")}>
          Отклонить
        </button>{" "}
        <button type="button" disabled={busy} onClick={() => void orgAction("revise")}>
          На доработку
        </button>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: "1rem" }}>Филиалы</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {org.branches.map((b) => (
            <li
              key={b.id}
              id={`branch-${b.id}`}
              style={{
                border: focusBranch === b.id ? "2px solid #e53935" : "1px solid #eee",
                padding: 12,
                marginBottom: 8,
                borderRadius: 8,
              }}
            >
              <strong>{b.submitted.name}</strong> · {b.catalogStatus}
              {b.hasSubmittedDiff ? " · diff" : ""}
              <div>
                {b.submitted.city}, {b.submitted.address}
              </div>
              {b.submitted.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.submitted.photoUrl} alt="" style={{ maxWidth: 120, marginTop: 8 }} />
              ) : null}
              {b.catalogStatus === "PENDING" ? (
                <div style={{ marginTop: 8 }}>
                  <button type="button" disabled={busy} onClick={() => void branchAction(b.id, "approve")}>
                    Одобрить филиал
                  </button>{" "}
                  <button type="button" disabled={busy} onClick={() => void branchAction(b.id, "reject")}>
                    Отклонить
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {focusedBranch ? <p>Фокус на филиале {focusedBranch.submitted.name}</p> : null}
      {message ? <p>{message}</p> : null}
    </div>
  );
}
