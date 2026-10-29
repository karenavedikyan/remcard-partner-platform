const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isFocusableVisible(el: HTMLElement): boolean {
  if (el.getAttribute("aria-hidden") === "true") return false;
  if (el.tabIndex < 0) return false;
  const style = window.getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none") return false;
  if (el.getClientRects().length > 0) return true;
  // jsdom and zero-size sentinels: still focusable when not explicitly hidden
  return el.isConnected;
}

export function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isFocusableVisible);
}

export function handleDialogTabKey(event: KeyboardEvent, container: HTMLElement): void {
  if (event.key !== "Tab") return;
  const focusable = getFocusableElements(container);
  if (focusable.length === 0) return;
  if (focusable.length === 1) {
    event.preventDefault();
    focusable[0]!.focus();
    return;
  }
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  const active = document.activeElement as HTMLElement | null;

  if (event.shiftKey) {
    if (active === first || !container.contains(active)) {
      event.preventDefault();
      last.focus();
    }
  } else if (active === last || !container.contains(active)) {
    event.preventDefault();
    first.focus();
  }
}

type BodyScrollLock = {
  overflow: string;
  paddingRight: string;
};

let bodyScrollLockCount = 0;
let savedBodyScroll: BodyScrollLock | null = null;

export function lockBodyScroll(): void {
  if (bodyScrollLockCount === 0) {
    savedBodyScroll = {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
    };
    const scrollbarGap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarGap > 0) {
      document.body.style.paddingRight = `${scrollbarGap}px`;
    }
  }
  bodyScrollLockCount += 1;
}

export function unlockBodyScroll(): void {
  if (bodyScrollLockCount <= 0) return;
  bodyScrollLockCount -= 1;
  if (bodyScrollLockCount === 0 && savedBodyScroll) {
    document.body.style.overflow = savedBodyScroll.overflow;
    document.body.style.paddingRight = savedBodyScroll.paddingRight;
    savedBodyScroll = null;
  }
}

/** @internal test helper */
export function resetBodyScrollLockForTests(): void {
  if (savedBodyScroll) {
    document.body.style.overflow = savedBodyScroll.overflow;
    document.body.style.paddingRight = savedBodyScroll.paddingRight;
  } else {
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
  }
  bodyScrollLockCount = 0;
  savedBodyScroll = null;
}
