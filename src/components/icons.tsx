import React from "react";

type P = { size?: number; className?: string };
const base = (size = 18) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const IconMic = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
    <path d="M12 18v4" />
    <path d="M8 22h8" />
  </svg>
);

export const IconWalkie = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M7 7V3" />
    <rect x="6" y="7" width="12" height="15" rx="3" />
    <path d="M9 11h6" />
    <rect x="9" y="14" width="6" height="4" rx="1" />
  </svg>
);

export const IconGear = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" />
  </svg>
);

export const IconUsers = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const IconAntenna = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4.9 4.9a10 10 0 0 0 0 14.2" />
    <path d="M7.8 7.8a6 6 0 0 0 0 8.4" />
    <path d="M19.1 4.9a10 10 0 0 1 0 14.2" />
    <path d="M16.2 7.8a6 6 0 0 1 0 8.4" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" />
  </svg>
);

export const IconPlay = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none" />
  </svg>
);

export const IconStop = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />
  </svg>
);

export const IconTray = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.4 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.4-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.8 1.1Z" />
  </svg>
);

export const IconChevron = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const IconX = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

export const IconCheck = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const IconDownload = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <path d="M12 15V3" />
  </svg>
);

export const IconBell = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
  </svg>
);

export const IconCamera = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

export const IconRecord = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
  </svg>
);

export const IconLive = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M2 12h3l3-8 4 16 3-8h3" />
    <circle cx="21" cy="12" r="1.6" fill="currentColor" stroke="none" />
  </svg>
);

export const IconLogout = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <path d="M21 12H9" />
  </svg>
);

export const IconPlus = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

/* Iconos de efectos */
export const EffectIcon = ({ id, size = 16, className }: { id: string } & P) => {
  switch (id) {
    case "down":
      return (
        <svg {...base(size)} className={className}>
          <path d="M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" />
          <polyline points="9 18 12 21 15 18" />
        </svg>
      );
    case "up":
      return (
        <svg {...base(size)} className={className}>
          <path d="M3 12c1.5-6 3-6 4.5 0S10.5 18 12 12s3-6 4.5 0 3 6 4.5 0" />
          <polyline points="9 6 12 3 15 6" />
        </svg>
      );
    case "bolt":
      return (
        <svg {...base(size)} className={className}>
          <polygon points="13 2 3 14 11 14 9 22 21 10 13 10 13 2" />
        </svg>
      );
    case "bot":
      return (
        <svg {...base(size)} className={className}>
          <rect x="4" y="8" width="16" height="12" rx="3" />
          <path d="M12 8V4" />
          <circle cx="12" cy="3" r="1" fill="currentColor" />
          <circle cx="9" cy="13" r="1" fill="currentColor" />
          <circle cx="15" cy="13" r="1" fill="currentColor" />
          <path d="M9 17h6" />
        </svg>
      );
    case "radio":
      return (
        <svg {...base(size)} className={className}>
          <rect x="3" y="9" width="18" height="11" rx="2" />
          <path d="m7 9 10-6" />
          <circle cx="8.5" cy="14.5" r="2.5" />
          <path d="M15 13h3M15 16h3" />
        </svg>
      );
    default:
      return (
        <svg {...base(size)} className={className}>
          <path d="M2 12h2l2-5 3 10 3-14 3 14 3-10 2 5h2" />
        </svg>
      );
  }
};
