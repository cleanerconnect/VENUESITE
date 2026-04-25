// Stroke-based line icons. No emoji, no library — just clean SVG.
// 20px viewport, currentColor, stroke 1.5.

const baseProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 20 20",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const IconHome = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...p}>
    <path d="M3 9.5 10 3l7 6.5V17a1 1 0 0 1-1 1h-3v-5H8v5H4a1 1 0 0 1-1-1V9.5Z" />
  </svg>
);

export const IconCalendar = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...p}>
    <rect x="3" y="4.5" width="14" height="13" rx="1" />
    <path d="M3 8h14M7 3v3M13 3v3" />
  </svg>
);

export const IconScan = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...p}>
    <path d="M4 7V5a1 1 0 0 1 1-1h2M16 7V5a1 1 0 0 0-1-1h-2M4 13v2a1 1 0 0 0 1 1h2M16 13v2a1 1 0 0 1-1 1h-2M4 10h12" />
  </svg>
);

export const IconWallet = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...p}>
    <rect x="2.5" y="5" width="15" height="11" rx="1" />
    <path d="M14 10.5h2.5" />
  </svg>
);

export const IconUsers = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...p}>
    <circle cx="7" cy="7.5" r="2.5" />
    <path d="M2.5 16c.5-2.5 2.5-4 4.5-4s3.5 1.2 4.5 4" />
    <circle cx="13.5" cy="8" r="2" />
    <path d="M13 13.5c2 .3 3.5 1.5 4 4" />
  </svg>
);

export const IconSettings = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...p}>
    <circle cx="10" cy="10" r="2.5" />
    <path d="M10 1.5v2M10 16.5v2M3.5 10h-2M18.5 10h-2M5 5l-1.4-1.4M16.4 16.4 15 15M5 15l-1.4 1.4M16.4 3.6 15 5" />
  </svg>
);

export const IconPlus = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...p}>
    <path d="M10 4v12M4 10h12" />
  </svg>
);

export const IconArrow = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...p}>
    <path d="M4 10h12M12 6l4 4-4 4" />
  </svg>
);

export const IconBack = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...p}>
    <path d="M16 10H4M8 6l-4 4 4 4" />
  </svg>
);

export const IconMore = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...p}>
    <circle cx="5" cy="10" r="1" />
    <circle cx="10" cy="10" r="1" />
    <circle cx="15" cy="10" r="1" />
  </svg>
);

export const IconSearch = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...p}>
    <circle cx="9" cy="9" r="5" />
    <path d="m13 13 4 4" />
  </svg>
);

export const IconCheck = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...p}>
    <path d="M4 10.5 8 14l8-9" />
  </svg>
);

export const IconClose = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...p}>
    <path d="m5 5 10 10M15 5 5 15" />
  </svg>
);

export const IconDownload = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...p}>
    <path d="M10 3v10M5 9l5 5 5-5M3 17h14" />
  </svg>
);

export const IconCopy = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...p}>
    <rect x="6" y="6" width="11" height="11" rx="1" />
    <path d="M14 6V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2" />
  </svg>
);

export const IconBell = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...p}>
    <path d="M5 8a5 5 0 0 1 10 0v4l1.5 2.5h-13L5 12V8ZM8 17a2 2 0 0 0 4 0" />
  </svg>
);

export const IconLogo = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...p} width={28} height={28} viewBox="0 0 28 28">
    <path d="M6 5v14M6 19h11" stroke="currentColor" strokeWidth={2} />
    <circle cx="22" cy="7" r="2" fill="#C9A64C" stroke="none" />
  </svg>
);
