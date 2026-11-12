/**
 * Ensure catalogue matches PROTOTYPE-PAGES.md table rows.
 * Run: node prototype-numbering.stability.mjs
 */
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const src = readFileSync(new URL("./prototype-numbering.js", import.meta.url), "utf8");
const md = readFileSync(new URL("./PROTOTYPE-PAGES.md", import.meta.url), "utf8");

const jsPages = [...src.matchAll(/\{\s*n:\s*(\d+),\s*id:\s*"([^"]+)"/g)].map((m) => ({
  n: Number(m[1]),
  id: m[2],
}));

const mdPages = [...md.matchAll(/\|\s*(\d+)\s*\|\s*`([^`]+)`\s*\|/g)].map((m) => ({
  n: Number(m[1]),
  id: m[2],
}));

assert.equal(jsPages.length, mdPages.length, "JS vs MD row count");
for (let i = 0; i < jsPages.length; i++) {
  assert.equal(jsPages[i].n, mdPages[i].n, `row ${i + 1} number`);
  assert.equal(jsPages[i].id, mdPages[i].id, `row ${i + 1} id ${jsPages[i].id}`);
}

console.log("prototype-numbering.stability: ok");
