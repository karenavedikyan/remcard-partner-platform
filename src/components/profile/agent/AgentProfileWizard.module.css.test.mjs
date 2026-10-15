import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const css = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'AgentProfileWizard.module.css'),
  'utf8',
);

describe('R02-LIVE-UI CSS deltas', () => {
  it('flattens pure-agent outer panel on mobile only', () => {
    assert.match(css, /\.pureAgentPanel/);
    assert.match(css, /max-width:\s*480px[\s\S]*\.pureAgentPanel[\s\S]*box-shadow:\s*none/);
  });

  it('keeps footer nowrap at 375 by moving wrap rules below 360px', () => {
    assert.match(css, /max-width:\s*359px[\s\S]*\.actionsRight[\s\S]*flex-wrap:\s*wrap/);
    const block480 = css.match(/@media \(max-width: 480px\) \{([\s\S]*?)\n\}/g) ?? [];
    for (const block of block480) {
      assert.doesNotMatch(block, /\.actionsRight[\s\S]*width:\s*100%/);
    }
  });
});
