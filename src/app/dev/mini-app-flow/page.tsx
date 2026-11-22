"use client";

import { Suspense } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { MiniAppRoot } from "@/components/mini-app/MiniAppRoot";
import { MINI_APP_FIXTURES } from "../mini-app-fixture/fixtures-data";

const FLOW_SCREENS = new Set(["create", "scan", "invite", "full-cabinet"]);

function MiniAppFlowInner() {
  const searchParams = useSearchParams();
  if (process.env.NODE_ENV === "production") notFound();
  const fixtureKey = searchParams.get("fixture") ?? "specialist-telegram";
  const screen = searchParams.get("screen") ?? "home";
  const row = MINI_APP_FIXTURES[fixtureKey];
  if (!row) notFound();
  if (screen !== "home" && !FLOW_SCREENS.has(screen)) notFound();
  return (
    <div data-mini-app-synthetic-fixture="1" data-mini-app-flow-screen={screen}>
      <MiniAppRoot
        fixtureBootstrap={row.bootstrap}
        fixturePlatform={row.platform}
        initialScreen={screen as "create" | "scan" | "invite" | "full-cabinet" | "home"}
      />
    </div>
  );
}

export default function MiniAppFlowPage() {
  return (
    <Suspense fallback={<p>Загрузка…</p>}>
      <MiniAppFlowInner />
    </Suspense>
  );
}