/**
 * Book page catalogue sanity (no DOM). Run: node prototype-numbering.selftest.mjs
 */
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const src = readFileSync(new URL("./prototype-numbering.js", import.meta.url), "utf8");
const css = readFileSync(new URL("./prototype-numbering.css", import.meta.url), "utf8");
const md = readFileSync(new URL("./PROTOTYPE-PAGES.md", import.meta.url), "utf8");

const pageBlocks = [...src.matchAll(/\{\s*n:\s*(\d+),\s*id:\s*"([^"]+)",\s*title:\s*"([^"]+)"/g)];
assert.equal(pageBlocks.length, 67, "expected 67 catalogue entries in JS");

const numbers = pageBlocks.map((m) => Number(m[1]));
const ids = pageBlocks.map((m) => m[2]);
assert.deepEqual(numbers, [...Array(67)].map((_, i) => i + 1), "page numbers must be 1..67 consecutive");
assert.equal(new Set(ids).size, ids.length, "page ids must be unique");

assert.match(src, /PROTOTYPE_PAGE_CATALOG/, "export catalogue on window");
assert.match(src, /proto-page-badge/, "single page badge");
assert.doesNotMatch(src, /data-proto-number/, "no per-element badges");
assert.doesNotMatch(src, /proto-num-dialog-host/, "no dialog element dock");
assert.match(css, /pointer-events:\s*none/, "flow strip pass-through except controls");
assert.match(css, /\.proto-page-toc-btn/, "TOC control");
assert.match(md, /\| 67 \|/, "PROTOTYPE-PAGES.md documents page 67");

console.log("prototype-numbering.selftest: ok", { count: numbers.length });
