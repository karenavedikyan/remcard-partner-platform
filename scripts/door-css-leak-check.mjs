import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const wizardCss = readFileSync(
  path.join(ROOT, 'src/components/doorCalculator/door-wizard.css'),
  'utf8'
);
const outDir = '/opt/cursor/artifacts';
const FIXTURE_URL = 'http://127.0.0.1:3000/dev/door-css-leak-fixture';

async function measureCheckbox(page) {
  return page.evaluate(() => {
    const cb = document.querySelector('[aria-label="Выбрать партнёра"]');
    const rect = cb?.getBoundingClientRect();
    const body = getComputedStyle(document.body);
    return {
      checkbox: rect
        ? {
            width: Math.round(rect.width * 100) / 100,
            height: Math.round(rect.height * 100) / 100,
            left: Math.round(rect.left * 100) / 100,
            top: Math.round(rect.top * 100) / 100,
          }
        : null,
      bodyTokens: {
        surface: body.getPropertyValue('--surface').trim(),
        line: body.getPropertyValue('--line').trim(),
      },
    };
  });
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  await page.goto(FIXTURE_URL, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForSelector('[data-testid="agent-r04-partners-list"]', { timeout: 60000 });
  await page.waitForSelector('[aria-label="Выбрать партнёра"]', { timeout: 60000 });

  const before = await measureCheckbox(page);
  await page.screenshot({
    path: `${outDir}/partners-390-before-door-css.png`,
    fullPage: true,
  });

  await page.addStyleTag({ content: wizardCss });
  const afterWizard = await measureCheckbox(page);
  await page.screenshot({
    path: `${outDir}/partners-390-after-door-css.png`,
    fullPage: true,
  });

  await browser.close();
  console.log(JSON.stringify({ before, afterWizard, fixtureUrl: FIXTURE_URL }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});