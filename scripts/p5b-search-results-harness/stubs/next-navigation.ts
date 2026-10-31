export function useSearchParams() {
  return new URLSearchParams();
}

export function usePathname() {
  return "/partners";
}

export function useRouter() {
  return {
    push() {},
    replace() {},
    back() {},
    prefetch() {},
  };
}
