"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { remcardFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await remcardFetch("/api/auth/logout", { method: "POST", body: {} });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="secondary"
      onClick={handleLogout}
      disabled={loading}
      className={className}
    >
      {loading ? "Выход…" : "Выйти"}
    </Button>
  );
}
