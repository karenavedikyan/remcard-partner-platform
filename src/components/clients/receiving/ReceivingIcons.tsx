type ReceivingIconName =
  | "bar-chart"
  | "settings"
  | "chevron-up"
  | "chevron-down"
  | "archive"
  | "plus"
  | "copy"
  | "pencil"
  | "search";

const PATHS: Record<ReceivingIconName, string> = {
  "bar-chart": '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  settings: '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
  "chevron-up": '<path d="m18 15-6-6-6 6"/>',
  "chevron-down": '<path d="m6 9 6 6 6-6"/>',
  archive:
    '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  pencil: '<path d="m15 5 4 4M4 20l4-.8L20 8a2.8 2.8 0 0 0-4-4L4.8 16Z"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
};

/** Same line-icon style as the empty-state icons (`ClientsEmptyIcon`): inline SVG, no icon package. */
export function ReceivingIcon({
  name,
  className,
  ...rest
}: { name: ReceivingIconName; className?: string } & Record<string, unknown>) {
  return (
    <svg
      {...rest}
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: PATHS[name] }}
    />
  );
}
