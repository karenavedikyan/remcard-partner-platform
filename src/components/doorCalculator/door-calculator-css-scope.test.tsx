import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

function extractRuleSelectors(css: string): string[] {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors: string[] = [];
  let i = 0;
  while (i < stripped.length) {
    while (i < stripped.length && /\s/.test(stripped[i])) i++;
    if (i >= stripped.length) break;
    if (stripped.slice(i).startsWith('@page')) {
      const hdrEnd = stripped.indexOf('{', i);
      let depth = 1;
      let j = hdrEnd + 1;
      while (j < stripped.length && depth > 0) {
        if (stripped[j] === '{') depth++;
        else if (stripped[j] === '}') depth--;
        j++;
      }
      i = j;
      continue;
    }
    if (stripped.slice(i).startsWith('@keyframes')) {
      const ob = stripped.indexOf('{', i);
      let depth = 1;
      let j = ob + 1;
      while (j < stripped.length && depth > 0) {
        if (stripped[j] === '{') depth++;
        else if (stripped[j] === '}') depth--;
        j++;
      }
      i = j;
      continue;
    }
    if (stripped.slice(i).match(/^@media(\s|\()/)) {
      const hdrEnd = stripped.indexOf('{', i);
      let depth = 1;
      let j = hdrEnd + 1;
      while (j < stripped.length && depth > 0) {
        if (stripped[j] === '{') depth++;
        else if (stripped[j] === '}') depth--;
        j++;
      }
      const inner = stripped.slice(hdrEnd + 1, j - 1);
      selectors.push(...extractRuleSelectors(inner));
      i = j;
      continue;
    }
  if (stripped[i] === '@') {
      const hdrEnd = stripped.indexOf('{', i);
      let depth = 1;
      let j = hdrEnd + 1;
      while (j < stripped.length && depth > 0) {
        if (stripped[j] === '{') depth++;
        else if (stripped[j] === '}') depth--;
        j++;
      }
      i = j;
      continue;
    }
    const brace = stripped.indexOf('{', i);
    if (brace === -1) break;
    const sel = stripped.slice(i, brace).trim();
    if (sel) selectors.push(sel);
    let depth = 1;
    let j = brace + 1;
    while (j < stripped.length && depth > 0) {
      if (stripped[j] === '{') depth++;
      else if (stripped[j] === '}') depth--;
      j++;
    }
    i = j;
  }
  return selectors;
}

function assertScoped(selectors: string[], root: string) {
  const forbidden = /^(:root|html|body|\*)$/;
  for (const group of selectors) {
    if (group.startsWith('@keyframes') || group.startsWith('@page')) continue;
    for (const part of group.split(',').map((s) => s.trim())) {
      expect(part).not.toMatch(forbidden);
      const scoped =
        part.includes(root) ||
        part.startsWith(`[data-theme=dark] ${root}`) ||
        part.startsWith(`[data-theme=dark].${root}`);
      expect(scoped, `Unscoped selector: ${part}`).toBe(true);
    }
  }
}

describe('door calculator CSS isolation', () => {
  it('door-wizard.css: все селекторы под .door-wizard', () => {
    const css = readFileSync(
      path.join(process.cwd(), 'src/components/doorCalculator/door-wizard.css'),
      'utf8'
    );
    assertScoped(extractRuleSelectors(css), '.door-wizard');
  });

  it('door-offer.css: все селекторы под .door-offer (кроме @page)', () => {
    const css = readFileSync(
      path.join(process.cwd(), 'src/components/doorCalculator/door-offer.css'),
      'utf8'
    );
    const selectors = extractRuleSelectors(css);
    assertScoped(selectors, '.door-offer');
  });
});