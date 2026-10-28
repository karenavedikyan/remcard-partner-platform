export const MAX_BULK_SELECTION = 100;
export const BULK_APPLY_CONCURRENCY = 3;
export const REGISTRY_PAGE_SIZES = [25, 50, 100] as const;
export type RegistryPageSize = (typeof REGISTRY_PAGE_SIZES)[number];

export const BULK_LIFECYCLE_ACTIONS = {
  hide_catalog: "Убрать из каталога",
  publish_catalog: "Вернуть в каталог",
  archive_project: "Архивировать профили",
  restore_project: "Восстановить профили",
} as const;

export type BulkLifecycleAction = keyof typeof BULK_LIFECYCLE_ACTIONS;

export const VIEW_MODE_STORAGE_KEY = "prof-admin-partners-registry-view";
