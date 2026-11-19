import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY ??= "vitest-yandex-key";

if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModalPolyfill(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function closePolyfill(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

if (
  typeof HTMLImageElement !== "undefined" &&
  typeof HTMLImageElement.prototype.decode !== "function"
) {
  HTMLImageElement.prototype.decode = function decodePolyfill(this: HTMLImageElement) {
    if (!this.src) return Promise.reject(new Error("image has no src"));
    if (this.complete && this.naturalWidth > 0) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const finish = (width: number, height: number) => {
        Object.defineProperty(this, "naturalWidth", { configurable: true, value: width });
        Object.defineProperty(this, "naturalHeight", { configurable: true, value: height });
        resolve();
      };
      const onSvgDataUri = () => {
        try {
          const raw = this.src.replace(/^data:image\/svg\+xml,/, "");
          const markup = decodeURIComponent(raw);
          const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
          if (doc.querySelector("parsererror")) {
            reject(new Error("image failed to decode"));
            return;
          }
          const root = doc.documentElement;
          const widthAttr = root.getAttribute("width");
          const heightAttr = root.getAttribute("height");
          const viewBox = root.getAttribute("viewBox")?.split(/\s+/) ?? [];
          const width = Number(widthAttr) || Number(viewBox[2]) || 0;
          const height = Number(heightAttr) || Number(viewBox[3]) || 0;
          if (width <= 0 || height <= 0) {
            reject(new Error("image failed to decode"));
            return;
          }
          finish(width, height);
        } catch {
          reject(new Error("image failed to decode"));
        }
      };
      if (this.src.startsWith("data:image/svg+xml")) {
        onSvgDataUri();
        return;
      }
      this.addEventListener("load", () => resolve(), { once: true });
      this.addEventListener("error", () => reject(new Error("image failed to decode")), { once: true });
    });
  };
}

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: unknown }) => {
    const React = require("react") as typeof import("react");
    return React.createElement(
      "a",
      { href, ...rest },
      children as React.ReactNode,
    );
  },
}));

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});
