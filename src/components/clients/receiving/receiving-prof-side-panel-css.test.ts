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
});