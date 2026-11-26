import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const cssPath = path.join(
  process.cwd(),
  'src/components/doorCalculator/door-offer.css'
);

function pageBlockSource(css: string): string {
  const start = css.indexOf('.door-offer .page{');
  expect(start).toBeGreaterThanOrEqual(0);
  const afterStart = css.slice(start + '.door-offer .page{'.length);
  const close = afterStart.indexOf('\n}');
  expect(close).toBeGreaterThanOrEqual(0);
  return afterStart.slice(0, close);
}

describe('DoorOfferPage — палитра листа .page', () => {
  it('задаёт светлые цвета листа локально и не от селекторов темы', () => {
    const css = readFileSync(cssPath, 'utf8');
    const pageBlock = pageBlockSource(css);

    expect(pageBlock).toContain('--offer-ink:#252923');
    expect(pageBlock).toContain('--offer-muted:#6c706a');
    expect(pageBlock).toContain('--offer-line:#e5e5df');
    expect(pageBlock).toContain('--offer-table-head:#faf9f7');
    expect(pageBlock).not.toMatch(/var\(--ink/);
    expect(pageBlock).not.toMatch(/var\(--muted/);
    expect(pageBlock).not.toMatch(/var\(--line/);
    expect(pageBlock).not.toMatch(/var\(--offset/);
    expect(css).not.toMatch(/\[data-theme=dark\][^{]*\.door-offer \.page/);
  });
});