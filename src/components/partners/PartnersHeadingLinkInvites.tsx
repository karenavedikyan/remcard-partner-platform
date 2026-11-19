"use client";

import { createPortal } from "react-dom";
import { usePartnersPageChrome } from "@/components/partners/partnersPageChrome";
import styles from "./partners-page-heading.module.css";

function Link2Icon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 13a5 5 0 0 1 7.07 0l1.06 1.06a5 5 0 0 1-7.07 7.07L10 21.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M14 11a5 5 0 0 1-7.07 0L5.87 9.94a5 5 0 0 1 7.07-7.07L14 2.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PartnersHeadingLinkInvites() {
  const chrome = usePartnersPageChrome();
  const slot = chrome?.headingAction ?? null;
  const openGallery = chrome?.linkInviteGallery.openGallery;
  if (!slot || !openGallery) return null;

  const control = (
    <button
      type="button"
      className={styles.cta}
      data-testid="partners-page-heading-cta-link-invites"
      onClick={(event) => openGallery(event.currentTarget)}
    >
      <Link2Icon />
      Ссылки-приглашения
    </button>
  );

  return createPortal(control, slot);
}