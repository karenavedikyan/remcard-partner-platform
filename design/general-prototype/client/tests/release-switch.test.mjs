import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const core = fs.readFileSync(new URL('../core.js', import.meta.url), 'utf8');
const memory = fs.readFileSync(new URL('../../preview-memory.js', import.meta.url), 'utf8');
const start = core.indexOf('  function setRelease(n) {');
const end = core.indexOf('  const rel2 =', start);
assert.ok(start >= 0 && end > start, 'Use the actual release-switch implementation');
const releaseFunction = core.slice(start, end);

function switchRelease(href, releaseInput, storageFails = false) {
  let destination;
  const location = { href, replace(value) { destination = value; } };
  const rcDemoMemory = {
    setItem() {
      if (storageFails) throw new Error('Synthetic unavailable memory');
    },
  };
  vm.runInNewContext(`${releaseFunction}\nsetRelease(releaseInput);`, {
    URL, location, rcDemoMemory, releaseInput,
  });
  return destination;
}

let checks = 0;
for (const release of [1, 2]) {
  const input = 'https://example.test/client/index.html?city=kazan&rc_demo_release=1#/care?service=delivery';
  const output = new URL(switchRelease(input, release));
  assert.equal(output.searchParams.get('rc_demo_release'), String(release));
  assert.equal(output.searchParams.get('city'), 'kazan');
  assert.equal(output.hash, '#/care?service=delivery');
  assert.equal(output.pathname, '/client/index.html');
  const window = { location: { href: output.href } };
  vm.runInNewContext(memory, { window, URL, Map });
  assert.equal(window.rcDemoMemory.getItem('rc_release'), String(release),
    'Fresh document must seed the selected release, not reset to R1');
  checks++;
}

assert.equal(new URL(switchRelease('https://example.test/client/index.html#/catalog', 2, true))
  .searchParams.get('rc_demo_release'), '2', 'URL navigation does not depend on storage');
checks++;
for (const invalid of [0, 3, '2', NaN, undefined]) {
  assert.equal(switchRelease('https://example.test/client/index.html', invalid), undefined);
  checks++;
}
console.log(`release-switch: ${checks} checks passed`);
