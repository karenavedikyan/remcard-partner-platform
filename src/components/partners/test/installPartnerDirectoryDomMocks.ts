/** Local DOM stubs for partner find tests — do not add to global vitest.setup. */
export function installPartnerDirectoryDomMocks(): () => void {
  const prevMatchMedia = window.matchMedia;
  const prevResizeObserver = globalThis.ResizeObserver;

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("min-width: 761px"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as typeof ResizeObserver;
  }

  return () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: prevMatchMedia,
    });
    if (prevResizeObserver) globalThis.ResizeObserver = prevResizeObserver;
    else delete (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  };
}
