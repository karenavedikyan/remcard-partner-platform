/** @vitest-environment node */
/**
 * Source/CSS contracts for A13a partners presentation.
 * Node env required: Vite 6 jsdom externalizes node:fs/path to empty stubs.
 */
const mem = new Map<string, string>();
Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  value: {
    clear: () => mem.clear(),
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, String(v));
    },
    removeItem: (k: string) => {
      mem.delete(k);
    },
    key: (i: number) => [...mem.keys()][i] ?? null,
    get length() {
      return mem.size;
    },
  },
});

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = dirname(fileURLToPath(import.meta.url));
const CSS = join(ROOT, "AdminPartners.module.css");
const CLIENT = join(ROOT, "AdminPartnersClient.tsx");
const METRICS = join(ROOT, "AdminPartnersMetricsBar.tsx");
const LIST = join(ROOT, "AdminPartnersRegistryList.tsx");
const DETAIL = join(ROOT, "AdminPartnersPartnerDetailDialog.tsx");

describe("A13a partners source/CSS contracts", () => {
  it("pins R1 visibility switch chrome (42×25, brand on)", () => {
    const css = readFileSync(CSS, "utf8");
    const detail = readFileSync(DETAIL, "utf8");
    // A13b: button hit-target ≥44×44; painted track remains 42×25.
    expect(css).toMatch(/\.visibilitySwitch\s*\{[^}]*width:\s*44px/s);
    expect(css).toMatch(/\.visibilitySwitch\s*\{[^}]*height:\s*44px/s);
    expect(css).toMatch(/\.visibilitySwitch\s*\{[^}]*min-width:\s*44px/s);
    expect(css).toMatch(/\.visibilitySwitch\s*\{[^}]*min-height:\s*44px/s);
    expect(css).toMatch(/\.visibilitySwitchTrack\s*\{[^}]*width:\s*42px/s);
    expect(css).toMatch(/\.visibilitySwitchTrack\s*\{[^}]*height:\s*25px/s);
    expect(css).toMatch(
      /\.visibilitySwitch\[aria-checked="true"\]\s*\.visibilitySwitchTrack\s*\{[^}]*background:\s*#c12b2f/s,
    );
    expect(css).toContain(".resetSearchRules");
    expect(detail).toContain('role="switch"');
    expect(detail).toContain('data-visibility-switch="catalog"');
    expect(detail).toContain('data-visibility-switch="cooperation"');
    expect(detail).toContain("onRequestPreview");
    expect(detail).toContain("hide_catalog");
    expect(detail).toContain("publish_catalog");
  });

  it("keeps R1 structural markers (chips, panel, detail, visit GAP)", () => {
    const css = readFileSync(CSS, "utf8");
    const client = readFileSync(CLIENT, "utf8");
    const metrics = readFileSync(METRICS, "utf8");
    const list = readFileSync(LIST, "utf8");
    const detail = readFileSync(DETAIL, "utf8");

    expect(metrics).toContain("Все типы");
    expect(metrics).toContain("typeCounter");
    expect(client).toContain("Регистрация и видимость");
    expect(client).toContain("Имя, компания, город, ID");
    expect(client).toContain("AdminPartnersPartnerDetailDialog");
    expect(list).toContain("Визит*");
    expect(list).toContain("Нет данных");
    expect(detail).toContain("Карточка партнёра");
    expect(detail).toContain("Удалить аккаунт партнёра");
    expect(detail).toContain("archive_project");
    expect(css).toContain(".filterChip");
    expect(css).toContain(".bulkBar");
    expect(css).toContain(".partnerDetailDialog");
    expect(css).toContain(".partnerDetailDrawer");
    expect(css).toContain(".visibilitySwitch");
    expect(css).toContain(".partnersTable");
    expect(client).toContain("invalidateSinglePreviewContext");
    expect(client).toContain("dialogError");
    expect(client).toContain("Повторить загрузку");
    expect(client).toContain("data-partner-open-trigger");
    expect(detail).toContain("dialogError");
    expect(detail).toContain("Видимость в каталоге");
    expect(detail).toContain("Видимость в сотрудничестве");
    expect(detail).toContain("RemScore");
    expect(client).not.toMatch(/fetchAdminPartnerDetail|profileFill|lastVisit/);
  });

  it("does not touch partner LK runtime paths", () => {
    const client = readFileSync(CLIENT, "utf8");
    expect(client).not.toContain("src/components/partners");
    expect(client).not.toContain("@/components/partners");
  });

  it("pins geometry/column and mobile flex-basis contracts", () => {
    const css = readFileSync(CSS, "utf8");
    const detail = readFileSync(DETAIL, "utf8");
    const list = readFileSync(LIST, "utf8");
    expect(css).toMatch(/\.colPartner\s*\{[^}]*width:\s*298px/s);
    expect(css).toMatch(/\.colReg\s*\{[^}]*width:\s*161px/s);
    expect(css).toMatch(/\.colCatalog\s*\{[^}]*width:\s*122px/s);
    expect(css).toMatch(/\.colCoop\s*\{[^}]*width:\s*179px/s);
    expect(css).toMatch(/\.partnerName\s*\{[^}]*max-width:\s*290px/s);
    expect(css).toMatch(/\.detailRegBadge\s*\{[^}]*width:\s*fit-content/s);
    expect(css).toMatch(
      /@media\s*\(max-width:\s*900px\)[\s\S]*\.detailSettingsCopy,\s*\n\s*\.detailToggleActions\s*\{[^}]*flex:\s*0\s+0\s+auto[^}]*flex-basis:\s*auto/s,
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*900px\)[\s\S]*\.detailStats\s*>\s*div:last-child\s*\{[^}]*display:\s*flex[^}]*justify-content:\s*space-between/s,
    );
    expect(css).toMatch(/\.detailSettingsCopy\s*\{[^}]*flex:\s*1\s+1\s+14rem/s);
    expect(css).toMatch(/\.detailToggleActions\s*\{[^}]*flex:\s*0\s+1\s+auto/s);
    expect(css).toMatch(/\.detailToggleActions\s*\{[^}]*min-width:\s*0/s);
    expect(css).toMatch(/\.dialogErrorZone\s*\{[^}]*position:\s*sticky/s);
    expect(css).toMatch(/\.detailSettingsRow\s*\{[^}]*flex-wrap:\s*wrap/s);
    expect(css).not.toMatch(/\.detailToggleActions\s*\{[^}]*flex-shrink:\s*0/s);
    expect(css).not.toMatch(/\.detailSettingsCopy[^{]*\{[^}]*max-height:\s*\d/s);
    expect(css).not.toMatch(/\.detailToggleActions[^{]*\{[^}]*overflow:\s*hidden/s);
    expect(detail).toContain("dialogErrorZone");
    expect(detail).toContain("data-dialog-error-zone");
    expect(detail).toContain("onRetryDialogError");
    expect(detail).toContain("postApplyFocusKey");
    expect(detail).toContain("detailRegBadge");
    expect(list).toContain("colPartner");
  });
});
