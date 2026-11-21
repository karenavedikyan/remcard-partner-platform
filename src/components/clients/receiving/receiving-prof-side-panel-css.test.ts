import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("prof side panel CSS contracts", () => {
  const css = readFileSync(join(__dirname, "receiving.module.css"), "utf8");
  const profBlock = css.slice(css.indexOf(".profSidePanel {"));

  it("queue-kicker typography matches prototype A", () => {
    expect(profBlock).toMatch(/\.profSidePanel :global\(\.queue-kicker\)[\s\S]*font-size:\s*10px/);
    expect(profBlock).toMatch(/font-weight:\s*750/);
    expect(profBlock).toMatch(/letter-spacing:\s*0\.8px/);
    expect(profBlock).toMatch(/color:\s*var\(--accent/);
  });

  it("client id plate and certificate plate sizing", () => {
    expect(profBlock).toMatch(/\.appeal-client-box \.certificate-summary\)[\s\S]*min-height:\s*44px/);
    expect(profBlock).toMatch(/padding:\s*7px 9px/);
    expect(profBlock).toMatch(/\.prof-side-scroll > \.certificate-summary\)[\s\S]*min-height:\s*31px/);
    expect(profBlock).toMatch(/\.appeal-client-box \.certificate-summary \.number-copy\)[\s\S]*30px/);
  });

  it("footer, KP button, textarea, history, help", () => {
    expect(profBlock).toMatch(/\.editor-foot \.form-actions \.btn\)[\s\S]*height:\s*36px/);
    expect(profBlock).toMatch(/padding:\s*6px 11px/);
    expect(profBlock).toMatch(/\.prof-side-actions \.btn\.secondary\)[\s\S]*height:\s*36px/);
    expect(profBlock).toMatch(/\.prof-drawer-form textarea\)[\s\S]*min-height:\s*77px/);
    expect(profBlock).toMatch(/details\.history summary\)[\s\S]*min-height:\s*39px/);
    expect(profBlock).toMatch(/\.prof-side-scroll > p\.help\)[\s\S]*font-size:\s*12px/);
    expect(profBlock).toMatch(/\.custom-fields > strong\)[\s\S]*font-size:\s*14px/);
    expect(profBlock).toMatch(/\.prof-copy-row \.number-copy\)[\s\S]*height:\s*39px/);
  });

  it("font weights for title and primary actions", () => {
    expect(profBlock).toMatch(/\.prof-side-header h2\)[\s\S]*font-weight:\s*700/);
    expect(profBlock).toMatch(/\.prof-side-actions \.btn\.secondary\)[\s\S]*font-weight:\s*720/);
    expect(profBlock).toMatch(/\.editor-foot \.form-actions \.btn\)[\s\S]*font-weight:\s*720/);
  });

  it("narrow certificate plates wrap values without break-all", () => {
    const narrow = profBlock.slice(profBlock.indexOf("@media (max-width: 374px)"));
    expect(narrow).toMatch(/flex-wrap:\s*wrap/);
    expect(profBlock).toMatch(/\.certificate-summary strong\)[\s\S]*overflow-wrap:\s*anywhere/);
    expect(profBlock).not.toMatch(/\.certificate-summary strong\)[\s\S]*word-break:\s*break-all/);
    expect(profBlock).toMatch(/\.certificate-summary strong\)[\s\S]*word-break:\s*normal/);
  });
});