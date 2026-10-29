import { afterEach, describe, expect, it } from "vitest";
import {
  getFocusableElements,
  handleDialogTabKey,
  lockBodyScroll,
  resetBodyScrollLockForTests,
  unlockBodyScroll,
} from "./dialog-focus";

describe("dialog-focus", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    resetBodyScrollLockForTests();
  });

  it("locks and restores body overflow", () => {
    document.body.style.overflow = "scroll";
    lockBodyScroll();
    expect(document.body.style.overflow).toBe("hidden");
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("supports nested lock/unlock pairs", () => {
    lockBodyScroll();
    lockBodyScroll();
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe("hidden");
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe("");
  });

  it("keeps single focusable on Tab", () => {
    const root = document.createElement("div");
    root.innerHTML = `<button type="button" id="only">Only</button>`;
    document.body.appendChild(root);
    const only = root.querySelector("#only") as HTMLButtonElement;
    only.focus();
    const tab = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    handleDialogTabKey(tab, root);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(only);
  });

  it("traps Tab within container", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <button type="button" id="a">A</button>
      <button type="button" id="b">B</button>
    `;
    document.body.appendChild(root);
    const a = root.querySelector("#a") as HTMLButtonElement;
    const b = root.querySelector("#b") as HTMLButtonElement;
    a.focus();

    const tabForward = new KeyboardEvent("keydown", { key: "Tab", bubbles: true });
    handleDialogTabKey(tabForward, root);
    expect(document.activeElement).toBe(a);

    b.focus();
    handleDialogTabKey(tabForward, root);
    expect(document.activeElement).toBe(a);

    const tabBack = new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true });
    a.focus();
    handleDialogTabKey(tabBack, root);
    expect(document.activeElement).toBe(b);
  });

  it("lists only visible enabled focusables", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <button type="button" id="ok">OK</button>
      <button type="button" disabled id="no">NO</button>
      <span tabindex="0" aria-hidden="true" id="sentinel">x</span>
    `;
    document.body.appendChild(root);
    const list = getFocusableElements(root);
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe("ok");
  });
});
