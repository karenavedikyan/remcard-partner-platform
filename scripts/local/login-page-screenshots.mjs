/**
 * Capture /login screenshots for desktop, tablet, and mobile viewports.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.LOGIN_SCREENSHOT_URL ?? "http://127.0.0.1:3000";
const OUT = process.env.LOGIN_ARTIFACTS_DIR ?? "/opt/cursor/artifacts/prof-login-final";

const VIEWPORTS = [
  { name: "desktop_1440", width: 1440, height: 900 },
  { name: "tablet_768", width: 768, height: 900 },
  { name: "mobile_390", width: 390, height: 844 },
];

async function capture() {
  await mkdir(path.join(OUT, "screenshots"), { recursive: true });
  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 60000 });
    await page.getByRole("heading", { name: /присоединяйтесь к remcard prof/i }).waitFor({ timeout: 15000 });

    const gap =
      vp.width >= 701
        ? await page.evaluate(() => {
            const layout = document.querySelector('[class*="entryLayout"]');
            return layout ? getComputedStyle(layout).columnGap : null;
          })
        : null;

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    console.log(
      JSON.stringify({
        viewport: vp.name,
        columnGap: gap,
        horizontalOverflow: overflow.scrollWidth > overflow.clientWidth,
      }),
    );

    await page.screenshot({
      path: path.join(OUT, "screenshots", `${vp.name}.png`),
      fullPage: true,
    });
    await page.close();
  }

  await browser.close();
  console.log(`Screenshots saved to ${OUT}/screenshots`);
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
