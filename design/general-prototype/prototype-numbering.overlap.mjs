/**
 * Badge overlap sanity (browser). Dense partner cabinet + admin shell when present.
 */
import { chromium } from "playwright";

const cases = [
  {
    name: "partner-store-wallet",
    url: "http://127.0.0.1:8765/partner/index.html?open=clients&role=store",
    viewport: { width: 1440, height: 900 },
    settle: 1500,
  },
  {
    name: "partner-clients-dialog",
    url: "http://127.0.0.1:8765/partner/index.html?open=clients&role=store",
    viewport: { width: 1440, height: 900 },
    settle: 1500,
    async setup(page) {
      await page.getByRole("button", { name: "Уведомления" }).click();
      await page.waitForTimeout(400);
    },
  },
  {
    name: "admin-shell",
    url: "http://127.0.0.1:8765/admin/index.html#/partners",
    viewport: { width: 1440, height: 900 },
    settle: 800,
  },
  {
    name: "partner-mobile",
    url: "http://127.0.0.1:8765/partner/index.html?open=partners&role=company",
    viewport: { width: 390, height: 844 },
    settle: 1200,
  },
];

async function measure(page) {
  return page.evaluate(() => {
    const badges = [...document.querySelectorAll(".proto-num-badge")];
    const textRects = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.textContent || !/\S/.test(node.textContent)) return NodeFilter.FILTER_REJECT;
        const p = node.parentElement;
        if (!p || p.closest("[data-proto-numbering-ui]")) return NodeFilter.FILTER_REJECT;
        const st = getComputedStyle(p);
        if (st.display === "none" || st.visibility === "hidden") return NodeFilter.FILTER_REJECT;
        const r = p.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    while (walker.nextNode()) {
      const range = document.createRange();
      try {
        range.selectNodeContents(walker.currentNode);
        for (const r of range.getClientRects()) {
          if (r.width > 0 && r.height > 0) textRects.push(r);
        }
      } catch {
        /* skip */
      }
    }
    let conflicts = 0;
    for (const badge of badges) {
      const br = badge.getBoundingClientRect();
      const pad = window.innerWidth <= 640 ? 3 : 2;
      const box = {
        left: br.left - pad,
        top: br.top - pad,
        right: br.right + pad,
        bottom: br.bottom + pad,
      };
      for (const tr of textRects) {
        if (box.left < tr.right && box.right > tr.left && box.top < tr.bottom && box.bottom > tr.top) {
          conflicts += 1;
          break;
        }
      }
    }
    const reg = window.__protoNumRegistry;
    return {
      refs: reg?.count || 0,
      visibleBadges: badges.length,
      hidden: reg?.badgePlacement?.hidden ?? null,
      protectedRects: reg?.badgePlacement?.protectedRects ?? null,
      textOverlaps: conflicts,
      pageState: reg?.pageState || "",
    };
  });
}

async function main() {
  const browser = await chromium.launch();
  for (const c of cases) {
    const page = await browser.newPage({ viewport: c.viewport });
    await page.goto(c.url, { waitUntil: "networkidle" });
    if (c.setup) await c.setup(page);
    await page.waitForTimeout(c.settle);
    await page.waitForFunction(() => window.__protoNumRegistry?.count > 0, null, { timeout: 20000 }).catch(() => {});
    const stats = await measure(page);
    if (c.name === "admin-shell") {
      await page.screenshot({ path: "/opt/cursor/artifacts/numbering-admin-ann7.png", fullPage: true });
    }
    if (c.name === "partner-store-wallet") {
      await page.screenshot({ path: "/opt/cursor/artifacts/numbering-partner-wallet-readability-ann7.png", fullPage: false });
    }
    if (stats.textOverlaps > 0) {
      console.error(`FAIL ${c.name}`, stats);
      await browser.close();
      process.exit(1);
    }
    console.log(`ok ${c.name}`, JSON.stringify(stats));
    await page.close();
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
