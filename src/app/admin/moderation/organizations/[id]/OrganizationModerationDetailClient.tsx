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
import { setProfTestPublicCatalogShow } from "@/lib/prof-admin-api";
import {
  validateModerationRejectClient,
  validateModerationReviseClient,
} from "@/lib/prof-admin-moderation-validation";

const MODERATION_FOCUS_HASH_KEY = "profModerationFocusHash";

type BranchRow = {
  id: string;
  revisionToken?: string;
  catalogStatus: string;
  submitted: {
    name?: string;
    city?: string;
    address?: string;
    photoUrl?: string | null;
    workingHours?: string | null;
    description?: string | null;
  };
  hasSubmittedDiff: boolean;
};

type OrgPayload = {
  id: string;
  name: string;
  partnerType: string;
  catalogStatus: string;
  catalogPublished: boolean;
  ownerId: string;
  ownerPublicId: string;
  isTestPartner: boolean;
  profTestPublicCatalogAllowed: boolean | null;
  pendingBranchesCount: number;
  hasSubmittedDiff: boolean;
  revisionToken: string;
  submitted: {
    description?: string | null;
    logoUrl?: string | null;
    website?: string | null;
    telegram?: string | null;
    publicEmail?: string | null;
    publicPhone?: string | null;
    storeCategories?: string[];
    specializations?: string[];
    navigatorStageIds?: string[];
  };
  live: {
    description?: string | null;
    logoUrl?: string | null;
    website?: string | null;
    telegram?: string | null;
    publicEmail?: string | null;
    publicPhone?: string | null;
    catalogPublished?: boolean;
    storeCategories?: { key: string; label: string }[];
    specializations?: { key: string; label: string }[];
  };
  publicContacts: { type: string; label: string | null; value: string; isPublic: boolean }[];
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
  const [orgReviseComment, setOrgReviseComment] = useState("");
  const [orgRejectReason, setOrgRejectReason] = useState("");
  const [branchRejectReason, setBranchRejectReason] = useState("");
  const [branchReviseComment, setBranchReviseComment] = useState("");

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash) {
      sessionStorage.setItem(MODERATION_FOCUS_HASH_KEY, window.location.hash);
    } else {
      const saved = sessionStorage.getItem(MODERATION_FOCUS_HASH_KEY);
      if (saved) {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${saved}`);
        sessionStorage.removeItem(MODERATION_FOCUS_HASH_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    let branchFromHash: string | null = null;
    if (hash.startsWith("branch-")) {
      const rest = hash.slice("branch-".length);
      branchFromHash = rest.replace(/-reject$/, "").replace(/-revise$/, "");
    }
    const id = focusBranch ?? branchFromHash;
    if (id) {
      const el = document.getElementById(`branch-${id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusBranch, org]);

  const focusedBranch = useMemo(
    () => org?.branches.find((b) => b.id === focusBranch) ?? null,
    [org, focusBranch],
  );

  const orgAction = async (action: "approve" | "approve-all" | "reject" | "revise") => {
    if (busy || !org) return;
    if (action === "reject") {
      const err = validateModerationRejectClient(orgRejectReason);
      if (err) {
        setMessage(err);
        return;
      }
    }
    if (action === "revise") {
      const err = validateModerationReviseClient(orgReviseComment);
      if (err) {
        setMessage(err);
        return;
      }
    }
    if (action === "reject" && !window.confirm("Отклонить заявку организации?")) return;
    if (action === "revise" && !window.confirm("Вернуть организацию на доработку?")) return;
    if (action === "approve-all" && org) {
      const ok = window.confirm(
        `Одобрить организацию и все ${org.pendingBranchesCount} pending-филиалов?` +
          (org.pendingBranchesCount === 0 ? " (филиалов pending нет)" : "") +
          "\n\nПрофиль владельца (User) этим действием не одобряется — только org и филиалы.",
      );
      if (!ok) return;
    }
    if (action === "approve" && !window.confirm("Одобрить только организацию (без филиалов)?")) return;

    setBusy(true);
    setMessage(null);
    const pendingBranchRevisions =
      org?.branches
        .filter((b) => b.catalogStatus === "PENDING")
        .reduce<Record<string, string>>((acc, b) => {
          if (b.revisionToken) acc[b.id] = b.revisionToken;
          return acc;
        }, {}) ?? {};

    const body =
      action === "revise"
        ? { comment: orgReviseComment.trim(), revisionToken: org.revisionToken, attachments: [] }
        : action === "reject"
          ? { reason: orgRejectReason.trim(), revisionToken: org.revisionToken }
          : action === "approve"
            ? { revisionToken: org.revisionToken }
            : action === "approve-all"
              ? { revisionToken: org.revisionToken, branchRevisions: pendingBranchRevisions }
              : {};
    try {
      await moderationOrganizationAction(organizationId, action, body);
      setMessage("Решение по организации сохранено.");
      await load();
    } catch (e) {
      setMessage(e instanceof RemcardApiError ? e.message : "Ошибка");
    }
    setBusy(false);
  };

  const branchAction = async (branchId: string, action: "approve" | "reject" | "revise") => {
    if (busy) return;
    if (action === "reject") {
      const err = validateModerationRejectClient(branchRejectReason);
      if (err) {
        setMessage(err);
        return;
      }
    }
    if (action === "revise") {
      const err = validateModerationReviseClient(branchReviseComment);
      if (err) {
        setMessage(err);
        return;
      }
    }
    if (!window.confirm(`Подтвердите действие для филиала: ${action}`)) return;
    setBusy(true);
    const branch = org?.branches.find((b) => b.id === branchId);
    const body =
      action === "revise"
        ? { comment: branchReviseComment.trim(), revisionToken: branch?.revisionToken, attachments: [] }
        : action === "reject"
          ? { reason: branchRejectReason.trim(), revisionToken: branch?.revisionToken }
          : { revisionToken: branch?.revisionToken };
    try {
      await moderationBranchAction(branchId, action, body);
      setMessage("Решение по филиалу сохранено.");
      await load();
    } catch (e) {
      setMessage(e instanceof RemcardApiError ? e.message : "Ошибка");
    }
    setBusy(false);
  };

  const toggleTestPublic = async (allowed: boolean) => {
    if (!org?.ownerId) return;
    if (!window.confirm(allowed ? "Разрешить test в каталоге?" : "Скрыть test из каталога?")) return;
    setBusy(true);
    try {
      await setProfTestPublicCatalogShow(org.ownerId, allowed);
      await load();
    } catch (e) {
      setMessage(e instanceof RemcardApiError ? e.message : "Не удалось изменить opt-in");
    }
    setBusy(false);
  };

  if (loading) return <p>Загрузка…</p>;
  if (error) return <p role="alert">{error}</p>;
  if (!org) return <p>Не найдено</p>;

  const backQs = searchParams.toString();

  return (
    <div>
      <p>
        <Link href={`/admin/moderation${backQs ? `?${backQs}` : ""}`}>← Очередь</Link>
      </p>
      <h1>{org.name}</h1>
      <p>
        {org.partnerType} · {org.catalogStatus} · owner {org.ownerPublicId}
        {org.isTestPartner ? " · TEST" : ""}
      </p>
      {org.hasSubmittedDiff ? <p style={{ color: "#b45309" }}>Submitted отличается от live.</p> : null}

      {org.submitted.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={org.submitted.logoUrl} alt="" style={{ maxWidth: 160, marginBottom: 12 }} />
      ) : null}

      <section style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "1rem" }}>Поданные данные</h2>
        <p>{org.submitted.description ?? "—"}</p>
        <p>Сайт: {org.submitted.website ?? "—"}</p>
        <p>Telegram: {org.submitted.telegram ?? "—"}</p>
        <p>Email: {org.submitted.publicEmail ?? "—"}</p>
        <p>Телефон: {org.submitted.publicPhone ?? "—"}</p>
        <p>Категории: {(org.submitted.storeCategories ?? []).join(", ") || "—"}</p>
        <p>Специализации: {(org.submitted.specializations ?? []).join(", ") || "—"}</p>
        <p>Этапы: {(org.submitted.navigatorStageIds ?? []).join(", ") || "—"}</p>
      </section>

      <section style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "1rem" }}>Live (опубликовано)</h2>
        <p>{org.live.description ?? "—"}</p>
        <p>Публикация org: {org.live.catalogPublished ? "да" : "нет"}</p>
      </section>

      {org.publicContacts?.length ? (
        <section style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: "1rem" }}>Контакты (live rows)</h2>
          <ul>
            {org.publicContacts.map((c, i) => (
              <li key={`${c.type}-${i}`}>
                {c.type}: {c.value} {c.isPublic ? "" : "(скрыт)"}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "1rem" }}>Публикация test</h2>
        {org.isTestPartner ? (
          <>
            <p>
              Test opt-in:{" "}
              {org.profTestPublicCatalogAllowed ? "разрешён" : "не разрешён — approved test скрыт"}
            </p>
            <button type="button" disabled={busy} onClick={() => void toggleTestPublic(true)}>
              Разрешить test в каталоге
            </button>{" "}
            <button type="button" disabled={busy} onClick={() => void toggleTestPublic(false)}>
              Скрыть test
            </button>
          </>
        ) : (
          <p>Real partner — opt-in не требуется.</p>
        )}
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: "1rem" }}>Организация</h2>
        <button type="button" disabled={busy || org.catalogStatus !== "PENDING"} onClick={() => void orgAction("approve")}>
          Одобрить только организацию
        </button>{" "}
        <button
          type="button"
          disabled={busy || org.catalogStatus !== "PENDING"}
          onClick={() => void orgAction("approve-all")}
        >
          Одобрить org + pending филиалы ({org.pendingBranchesCount})
        </button>
        <div style={{ marginTop: 8 }}>
          <textarea
            placeholder="Причина отклонения организации"
            value={orgRejectReason}
            onChange={(e) => setOrgRejectReason(e.target.value)}
            rows={2}
            style={{ width: "100%", maxWidth: 480 }}
          />
          <button type="button" disabled={busy} onClick={() => void orgAction("reject")}>
            Отклонить организацию
          </button>
        </div>
        <div style={{ marginTop: 8 }}>
          <textarea
            placeholder="Комментарий для доработки организации"
            value={orgReviseComment}
            onChange={(e) => setOrgReviseComment(e.target.value)}
            rows={3}
            style={{ width: "100%", maxWidth: 480 }}
          />
          <button type="button" disabled={busy} onClick={() => void orgAction("revise")}>
            Вернуть организацию на доработку
          </button>
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: "1rem" }}>Филиалы</h2>
        <div style={{ marginBottom: 8 }}>
          <textarea
            placeholder="Причина отклонения филиала (для кнопок ниже)"
            value={branchRejectReason}
            onChange={(e) => setBranchRejectReason(e.target.value)}
            rows={2}
            style={{ width: "100%", maxWidth: 480 }}
          />
          <textarea
            placeholder="Комментарий доработки филиала"
            value={branchReviseComment}
            onChange={(e) => setBranchReviseComment(e.target.value)}
            rows={2}
            style={{ width: "100%", maxWidth: 480, marginTop: 8 }}
          />
        </div>
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
              <div>Часы: {b.submitted.workingHours ?? "—"}</div>
              {b.submitted.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.submitted.photoUrl} alt="" style={{ maxWidth: 120, marginTop: 8 }} />
              ) : null}
              {b.catalogStatus === "PENDING" ? (
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" disabled={busy} onClick={() => void branchAction(b.id, "approve")}>
                    Одобрить филиал
                  </button>
                  <button type="button" disabled={busy} onClick={() => void branchAction(b.id, "reject")}>
                    Отклонить
                  </button>
                  <button type="button" disabled={busy} onClick={() => void branchAction(b.id, "revise")}>
                    На доработку
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {focusedBranch ? <p>Фокус: филиал {focusedBranch.submitted.name}</p> : null}
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
