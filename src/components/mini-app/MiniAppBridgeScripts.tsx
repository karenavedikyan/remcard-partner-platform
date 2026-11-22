"use client";

import { useEffect } from "react";
import { loadMessengerBridge, readQueryPlatform } from "@/lib/mini-app/bridge-loader";

/** Eagerly starts official bridge script loads for /mini-app (detect runs after onload). */
export function MiniAppBridgeScripts() {
  useEffect(() => {
    const forced = readQueryPlatform();
    if (forced) {
      void loadMessengerBridge(forced);
      return;
    }
    void loadMessengerBridge("telegram");
    void loadMessengerBridge("max");
  }, []);
  return null;
}