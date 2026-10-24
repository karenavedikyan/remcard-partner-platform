import fs from "node:fs";
import path from "node:path";

export type ModerationCssContrastSurface = {
  id: string;
  theme: "light" | "dark";
  foreground: string;
  background: string;
  sourceFile: string;
  selector: string;
};

const SRC = path.join(process.cwd(), "src");

const ORG_DETAIL_CSS = path.join(
  SRC,
  "app/admin/moderation/organizations/[id]/OrganizationModerationDetail.module.css",
);
const QUEUE_CSS = path.join(SRC, "app/admin/moderation/AdminModeration.module.css");

const ORG_BADGE_CLASSES = ["badgePending", "badgeTest", "statusOk", "statusError"] as const;
const QUEUE_BADGE_CLASSES = [{ className: "badgeTest", id: "queueBadgeTest" }] as const;

function normalizeHex(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const m = trimmed.match(/^#([0-9a-fA-F]{3,8})$/);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length !== 6) return null;
  return `#${h.toLowerCase()}`;
}

function parseDeclBlock(body: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of body.split(";")) {
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key && val) map.set(key, val);
  }
  return map;
}

function extractRuleBlock(cssText: string, selector: string): Map<string, string> | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}\\s*\\{([^}]+)\\}`, "ms");
  const match = cssText.match(re);
  if (!match) return null;
  return parseDeclBlock(match[1]);
}

function mergeDecls(
  base: Map<string, string>,
  overlay: Map<string, string> | null,
): Map<string, string> {
  if (!overlay) return new Map(base);
  const merged = new Map(base);
  for (const [k, v] of overlay) merged.set(k, v);
  return merged;
}

function fgBgFromDecls(decls: Map<string, string>): { foreground: string; background: string } | null {
  const foreground = normalizeHex(decls.get("color"));
  const background = normalizeHex(decls.get("background") ?? decls.get("background-color"));
  if (!foreground || !background) return null;
  return { foreground, background };
}

function surfacesForFile(
  cssPath: string,
  className: string,
  id: string,
): ModerationCssContrastSurface[] {
  const cssText = fs.readFileSync(cssPath, "utf8");
  const rel = path.relative(path.join(SRC, ".."), cssPath);
  const lightDecls = extractRuleBlock(cssText, `.${className}`);
  if (!lightDecls) {
    throw new Error(`missing light rule .${className} in ${rel}`);
  }
  const darkDecls = extractRuleBlock(
    cssText,
    `:global([data-theme="dark"]) .${className}`,
  );
  const lightPair = fgBgFromDecls(lightDecls);
  if (!lightPair) {
    throw new Error(`missing explicit color/background on .${className} in ${rel}`);
  }
  const out: ModerationCssContrastSurface[] = [
    {
      id,
      theme: "light",
      ...lightPair,
      sourceFile: rel,
      selector: `.${className}`,
    },
  ];
  if (darkDecls) {
    const merged = mergeDecls(lightDecls, darkDecls);
    const darkPair = fgBgFromDecls(merged);
    if (!darkPair) {
      throw new Error(`dark theme .${className} missing color/background after merge in ${rel}`);
    }
    out.push({
      id,
      theme: "dark",
      ...darkPair,
      sourceFile: rel,
      selector: `:global([data-theme="dark"]) .${className}`,
    });
  }
  return out;
}

/** Reads actual moderation module CSS (light + dark global overrides). */
export function loadModerationBadgeSurfacesFromStylesheets(): ModerationCssContrastSurface[] {
  const surfaces: ModerationCssContrastSurface[] = [];
  for (const cls of ORG_BADGE_CLASSES) {
    surfaces.push(...surfacesForFile(ORG_DETAIL_CSS, cls, cls));
  }
  for (const { className, id } of QUEUE_BADGE_CLASSES) {
    surfaces.push(...surfacesForFile(QUEUE_CSS, className, id));
  }
  return surfaces;
}
