"use client";

import { useEffect, useState } from "react";
import { fetchProfAdminCapabilities } from "@/lib/prof-admin-api";
import { AdminLoginModal } from "@/components/auth/AdminLoginModal";
import type { AdminCapabilitiesState } from "@/components/auth/LoginExperience";
import styles from "./auth.module.css";

type Props = {
  returnTo?: string | null;
  autoOpen?: boolean;
  className?: string;
};

export function AdminLoginAccessory({ returnTo, autoOpen = false, className }: Props) {
  const [adminCaps, setAdminCaps] = useState<AdminCapabilitiesState>("pending");
  const [modalOpen, setModalOpen] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchProfAdminCapabilities()
      .then((c) => {
        if (cancelled) return;
        setAdminCaps(c.adminPasswordLogin ? "enabled" : "disabled");
      })
      .catch(() => {
        if (!cancelled) setAdminCaps("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!autoOpen || autoOpened) return;
    if (adminCaps === "pending") return;
    setModalOpen(true);
    setAutoOpened(true);
  }, [adminCaps, autoOpen, autoOpened]);

  const linkVisible =
    adminCaps === "enabled" || adminCaps === "pending" || adminCaps === "error";

  if (!linkVisible && !modalOpen) return null;

  return (
    <>
      {linkVisible ? (
        <div className={[styles.entryAdminAccess, className].filter(Boolean).join(" ")}>
          <button
            type="button"
            className={styles.entryAdminLink}
            data-testid="admin-login-open"
            onClick={() => setModalOpen(true)}
          >
            Администратору
          </button>
        </div>
      ) : null}
      <AdminLoginModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        returnTo={returnTo}
        adminCaps={adminCaps}
      />
    </>
  );
}
