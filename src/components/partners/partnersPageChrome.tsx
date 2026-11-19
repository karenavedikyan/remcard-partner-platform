"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type LinkInviteGalleryController = {
  open: boolean;
  refreshToken: number;
  openGallery: (opener?: HTMLElement | null) => void;
  closeGallery: () => void;
  bumpRefresh: () => void;
};

/** Props slice passed into PartnersHub when the route owns the gallery portal. */
export type LinkInviteGalleryBindings = {
  open: boolean;
  refreshToken: number;
  onOpen: (opener?: HTMLElement | null) => void;
  onClose: () => void;
  onRefresh: () => void;
};

export function linkInviteGalleryBindingsFromController(
  controller: LinkInviteGalleryController,
): LinkInviteGalleryBindings {
  return {
    open: controller.open,
    refreshToken: controller.refreshToken,
    onOpen: controller.openGallery,
    onClose: controller.closeGallery,
    onRefresh: controller.bumpRefresh,
  };
}

type PartnersPageChromeContextValue = {
  headingAction: HTMLElement | null;
  setHeadingAction: (element: HTMLElement | null) => void;
  linkInviteGallery: LinkInviteGalleryController;
};

const PartnersPageChromeContext = createContext<PartnersPageChromeContextValue | null>(null);

export function usePartnersPageChrome(): PartnersPageChromeContextValue | null {
  return useContext(PartnersPageChromeContext);
}

export function PartnersPageChromeProvider({
  children,
  linkInviteGallery,
}: {
  children: ReactNode;
  linkInviteGallery: LinkInviteGalleryController;
}) {
  const [headingAction, setHeadingAction] = useState<HTMLElement | null>(null);

  const value = useMemo(
    () => ({
      headingAction,
      setHeadingAction,
      linkInviteGallery,
    }),
    [headingAction, linkInviteGallery],
  );

  return (
    <PartnersPageChromeContext.Provider value={value}>{children}</PartnersPageChromeContext.Provider>
  );
}

/** Stable gallery controller for the Partners route (single portal/dialog host). */
export function useLinkInviteGalleryController(): LinkInviteGalleryController {
  const [open, setOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const openerRef = useRef<HTMLElement | null>(null);

  const openGallery = useCallback((opener?: HTMLElement | null) => {
    const active = opener ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    openerRef.current = active;
    setOpen(true);
  }, [openerRef]);

  const closeGallery = useCallback(() => {
    setOpen(false);
    const restore = openerRef.current;
    openerRef.current = null;
    if (!restore?.isConnected) return;
    requestAnimationFrame(() => {
      restore.focus({ preventScroll: true });
    });
  }, [openerRef]);

  const bumpRefresh = useCallback(() => {
    setRefreshToken((n) => n + 1);
  }, []);

  return useMemo(
    () => ({
      open,
      refreshToken,
      openGallery,
      closeGallery,
      bumpRefresh,
    }),
    [open, refreshToken, openGallery, closeGallery, bumpRefresh],
  );
}