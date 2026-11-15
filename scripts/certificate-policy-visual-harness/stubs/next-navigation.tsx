"use client";

export function usePathname(): string {
  return "/profile";
}

export function useRouter() {
  return {
    push: () => {},
    replace: () => {},
    refresh: () => {},
  };
}

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams();
}