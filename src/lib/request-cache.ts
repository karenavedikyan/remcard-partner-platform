import { cache as reactCache } from "react";

type CacheFn = <T extends (...args: never[]) => unknown>(fn: T) => T;

let cacheImpl: CacheFn = reactCache as CacheFn;

/** Test-only: replace React.cache with a deterministic per-test memo (vitest has no RSC cache). */
export function __setRequestCacheForTests(impl: CacheFn | null): void {
  cacheImpl = impl ?? (reactCache as CacheFn);
}

export function requestCache<T extends (...args: never[]) => unknown>(fn: T): T {
  return cacheImpl(fn);
}
