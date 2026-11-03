import * as React from "react";

type CacheFn = <T extends (...args: never[]) => unknown>(fn: T) => T;

/** Runtime `cache` exists on Next RSC React; plain Node/Vitest React 18 omits it. */
type ReactWithOptionalCache = typeof React & {
  cache?: CacheFn;
};

function resolveReactCache(): CacheFn | undefined {
  const candidate = (React as ReactWithOptionalCache).cache;
  return typeof candidate === "function" ? candidate : undefined;
}

/**
 * Request-scoped memo in Next RSC (`React.cache`). Identity passthrough elsewhere (Vitest, Node).
 * No module-level Map — dedupe on real navigations is proven only by native upstream counts.
 */
export function requestCache<T extends (...args: never[]) => unknown>(fn: T): T {
  const reactCache = resolveReactCache();
  if (reactCache) {
    return reactCache(fn);
  }
  return fn;
}
