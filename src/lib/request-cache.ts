import { cache as reactCache } from "react";

type CacheFn = <T extends (...args: never[]) => unknown>(fn: T) => T;

function defaultRequestCache<T extends (...args: never[]) => unknown>(fn: T): T {
  if (typeof reactCache === "function") {
    return reactCache(fn) as T;
  }
  return fn;
}

let cacheImpl: CacheFn = defaultRequestCache;

/** Test-only: replace React.cache with a deterministic per-test memo (vitest has no RSC cache). */
export function __setRequestCacheForTests(impl: CacheFn | null): void {
  cacheImpl = impl ?? defaultRequestCache;
}

export function requestCache<T extends (...args: never[]) => unknown>(fn: T): T {
  return cacheImpl(fn);
}
