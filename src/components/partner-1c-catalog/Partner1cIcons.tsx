import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

function Ic({ children, ...props }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export const PcIconEye = (p: P) => (
  <Ic {...p}>
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
    <circle cx="12" cy="12" r="3" />
  </Ic>
);

export const PcIconEyeOff = (p: P) => (
  <Ic {...p}>
    <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.576 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
    <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
    <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
    <path d="m2 2 20 20" />
  </Ic>
);

export const PcIconImageOff = (p: P) => (
  <Ic {...p}>
    <line x1="2" x2="22" y1="2" y2="22" />
    <path d="M10.41 10.41a2 2 0 1 1-2.83-2.83" />
    <line x1="13.5" x2="6" y1="13.5" y2="21" />
    <path d="M18 21v-7m-6-4H3" />
    <path d="M3 3h18v18" />
  </Ic>
);

export const PcIconAlert = (p: P) => (
  <Ic {...p}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </Ic>
);

export const PcIconSliders = (p: P) => (
  <Ic {...p}>
    <line x1="21" x2="14" y1="4" y2="4" />
    <line x1="10" x2="3" y1="4" y2="4" />
    <line x1="21" x2="12" y1="12" y2="12" />
    <line x1="8" x2="3" y1="12" y2="12" />
    <line x1="21" x2="16" y1="20" y2="20" />
    <line x1="12" x2="3" y1="20" y2="20" />
    <line x1="14" x2="14" y1="2" y2="6" />
    <line x1="8" x2="8" y1="10" y2="14" />
    <line x1="16" x2="16" y1="18" y2="22" />
  </Ic>
);

export const PcIconList = (p: P) => (
  <Ic {...p}>
    <line x1="8" x2="21" y1="6" y2="6" />
    <line x1="8" x2="21" y1="12" y2="12" />
    <line x1="8" x2="21" y1="18" y2="18" />
    <line x1="3" x2="3.01" y1="6" y2="6" />
    <line x1="3" x2="3.01" y1="12" y2="12" />
    <line x1="3" x2="3.01" y1="18" y2="18" />
  </Ic>
);

export const PcIconGrid = (p: P) => (
  <Ic {...p}>
    <rect width="7" height="7" x="3" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="14" rx="1" />
    <rect width="7" height="7" x="3" y="14" rx="1" />
  </Ic>
);

export const PcIconMaximize = (p: P) => (
  <Ic {...p}>
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" x2="14" y1="3" y2="10" />
    <line x1="3" x2="10" y1="21" y2="14" />
  </Ic>
);

export const PcIconMinimize = (p: P) => (
  <Ic {...p}>
    <polyline points="4 14 10 14 10 20" />
    <polyline points="20 10 14 10 14 4" />
    <line x1="14" x2="21" y1="10" y2="3" />
    <line x1="3" x2="10" y1="21" y2="14" />
  </Ic>
);

export const PcIconMapPin = (p: P) => (
  <Ic {...p}>
    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </Ic>
);

export const PcIconInfo = (p: P) => (
  <Ic {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </Ic>
);

export const PcIconX = (p: P) => (
  <Ic {...p}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Ic>
);

export const PcIconArrowLeft = (p: P) => (
  <Ic {...p}>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </Ic>
);

export const PcIconLock = (p: P) => (
  <Ic {...p}>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Ic>
);

export const PcIconExternal = (p: P) => (
  <Ic {...p}>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </Ic>
);

export const PcIconCalc = (p: P) => (
  <Ic {...p}>
    <rect width="16" height="20" x="4" y="2" rx="2" />
    <line x1="8" x2="16" y1="6" y2="6" />
    <line x1="16" x2="16" y1="14" y2="18" />
    <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01" />
  </Ic>
);

export const PcIconMonitor = (p: P) => (
  <Ic {...p}>
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <line x1="8" x2="16" y1="21" y2="21" />
    <line x1="12" x2="12" y1="17" y2="21" />
  </Ic>
);

export const PcIconPhone = (p: P) => (
  <Ic {...p}>
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
    <path d="M12 18h.01" />
  </Ic>
);