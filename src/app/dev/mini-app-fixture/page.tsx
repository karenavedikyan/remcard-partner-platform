"use client";

import { Suspense } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { MiniAppRoot } from "@/components/mini-app/MiniAppRoot";
import { MINI_APP_FIXTURES } from "./fixtures-data";

function MiniAppFixtureInner() {
  const searchParams = useSearchParams();
  if (process.env.NODE_ENV === "production") notFound();
  const fixtureKey = searchParams.get("fixture") ?? "specialist-telegram";
  const row = MINI_APP_FIXTURES[fixtureKey];
  if (!row) notFound();
  return (
    <div data-mini-app-synthetic-fixture="1">
      <MiniAppRoot
        fixtureBootstrap={row.bootstrap}
        fixturePlatform={row.platform}
        initialScreen={row.initialScreen}
        fixtureWalletData={row.fixtureWalletData}
      />
    </div>
  );
}

export default function MiniAppFixturePage() {
  return (
    <Suspense fallback={<p>Загрузка…</p>}>
      <MiniAppFixtureInner />
    </Suspense>
  );
}