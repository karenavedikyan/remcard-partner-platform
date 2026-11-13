/** Viewports auditor/Computer exercise for client row geometry and clicks. */
export const PERSONAL_ROW_MOBILE_WIDTHS = [768, 375, 360, 320] as const;

export type PersonalRowMobileWidth = (typeof PERSONAL_ROW_MOBILE_WIDTHS)[number];

/** Minimum visible width for the client open control (not document scrollWidth). */
export const MIN_CLIENT_OPEN_BUTTON_WIDTH_PX = 48;

export const MIN_CLIENT_OPEN_BUTTON_HEIGHT_PX = 44;
