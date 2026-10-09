"use client";

import { getCategoryIcon } from "@/lib/catalog-category-icons";
import styles from "./CatalogCategoryAvatar.module.css";

type CatalogCategoryAvatarProps = {
  imageUrl?: string | null;
  categories?: string[] | null;
  partnerType?: string | null;
  size?: "preview" | "compact";
};

export function CatalogCategoryAvatar({
  imageUrl,
  categories,
  partnerType,
  size = "preview",
}: CatalogCategoryAvatarProps) {
  const Icon = getCategoryIcon(categories, partnerType);
  const src = imageUrl?.trim();
  const wrapClass = size === "compact" ? styles.compact : styles.preview;

  return (
    <div className={`${styles.wrap} ${wrapClass}`} aria-hidden={!src}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className={styles.img} />
      ) : (
        <Icon className={styles.icon} />
      )}
    </div>
  );
}
