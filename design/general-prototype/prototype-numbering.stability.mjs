/**
 * Browser stability: modal dock + open panel must not rescan-loop.
 * Run from design/general-prototype:
 *   npx --yes playwright install chromium 2>/dev/null; node prototype-numbering.stability.mjs
 */
import { chromium } from "playwright";

const URL = "http://127.0.0.1:8765/partner/index.html?open=clients&role=store&v=ann7";
const SETTLE_MS = 1200;
const FRAMES = 60;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let rescanViaRegistry = 0;
  let lastRegistry = null;

  await page.addInitScript(() => {
    let last = null;
    Object.defineProperty(window, "__protoNumRegistry", {
      configurable: true,
      enumerable: true,
      get() {
        return last;
      },
      set(v) {
        if (last !== null && v !== last) window.__protoNumRegistryAssignCount = (window.__protoNumRegistryAssignCount || 0) + 1;
        last = v;
      },
    });
  });

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Уведомления" }).click();
  await page.getByRole("button", { name: "Список номеров" }).click();
  await page.waitForTimeout(SETTLE_MS);

  const probe = await page.evaluate(async (frames) => {
    let classMutations = 0;
    let childMutations = 0;
    const obs = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "attributes" && r.attributeName === "class") {
          const t = r.target;
          if (t === document.documentElement) classMutations += 1;
          else if (t instanceof HTMLDialogElement && !t.hasAttribute("data-proto-numbering-ui")) {
            classMutations += 1;
          }
        } else if (r.type === "childList") {
          childMutations += records.length;
        }
      }
    });
    obs.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  const registryAtStart = window.__protoNumRegistry;
  const assignAtStart = window.__protoNumRegistryAssignCount || 0;
  await new Promise((resolve) => {
      let n = 0;
      const tick = () => {
        n += 1;
        if (n >= frames) {
          obs.disconnect();
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return {
      registryStable: window.__protoNumRegistry === registryAtStart,
      registryAssignDelta: (window.__protoNumRegistryAssignCount || 0) - assignAtStart,
      classMutations,
      childMutations,
      dialogHost: document.querySelector("dialog[open]")?.classList.contains("proto-num-dialog-host"),
    };
  }, FRAMES);

  await browser.close();

  if (!probe.registryStable) {
    console.error("FAIL: __protoNumRegistry identity changed during", FRAMES, "frames", probe);
    process.exit(1);
  }
  if (probe.registryAssignDelta > 0) {
    console.error(
      "FAIL: __protoNumRegistry reassigned",
      probe.registryAssignDelta,
      "times (expected 0 after settle)",
      probe,
    );
    process.exit(1);
  }
  if (probe.classMutations > 2) {
    console.error("FAIL: excessive html/dialog class mutations", probe);
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      { ok: true, frames: FRAMES, ...probe, note: "registry identity stable after modal+panel" },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
