"use client";

import { useCallback, useState } from "react";

export function useCopyDisplayedValue() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copy = useCallback(async (key: string, text: string) => {
    const value = text.trim();
    if (!value || value === "—") return false;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((cur) => (cur === key ? null : cur)), 1600);
      return true;
    } catch {
      return false;
    }
  }, []);
  return { copy, copiedKey };
}