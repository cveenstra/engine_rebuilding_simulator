/** Small inline stroke icons, so there is no icon dependency and they follow currentColor. */
const PATHS = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9v11.5h13V9" /><path d="M10 20.5v-6h4v6" /></>,
  garage: <><path d="M2.5 9.5 12 4l9.5 5.5V20.5h-19z" /><path d="M6 20.5V12h12v8.5M6 15h12M6 18h12" /></>,
  review: <><path d="M4 12a8 8 0 0 1 14-5.3L20 9" /><path d="M20 4v5h-5" /><path d="M20 12a8 8 0 0 1-14 5.3L4 15" /><path d="M4 20v-5h5" /></>,
  compare: <><rect x="3" y="4" width="7.5" height="16" rx="1.5" /><rect x="13.5" y="4" width="7.5" height="16" rx="1.5" /><path d="M5.5 8.5h2.5M5.5 12h2.5M16 8.5h2.5M16 12h2.5" /></>,
  more: <><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></>,
  back: <path d="M15 5 8 12l7 7" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  left: <path d="M15 5 8 12l7 7" />,
  right: <path d="m9 5 7 7-7 7" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  flag: <><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  external: <><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>,
  engine: <><path d="M4 9h3l2-2.5h5V9h3l1.5 2H21v6h-2.5L17 19H9l-2-2.5H4z" /><path d="M11 6.5V4h3M1.5 11v4" /></>,
  gears: <><circle cx="8.5" cy="9" r="4" /><circle cx="16.5" cy="15.5" r="3.5" /><path d="M8.5 3.5V5M8.5 13v1.5M3 9h1.5M12.5 9H14M16.5 10.5V12M16.5 19v1.5M21.5 15.5H20" /></>,
  wrench: <path d="M14.5 4a5 5 0 0 0-4.8 6.4L3.5 16.6a2 2 0 0 0 2.9 2.9l6.2-6.2A5 5 0 0 0 19 8.5l-3 3-3.5-1-1-3.5 3-3z" />,
  walk: <><rect x="4" y="3.5" width="16" height="17" rx="2" /><path d="M8 8.5h8M8 12h8M8 15.5h5" /></>,
  shuffle: <><path d="M3 7h3.5c4 0 7 10 11 10H21" /><path d="M3 17h3.5c1.6 0 3-1.6 4.3-3.6M13.2 9.6C14.5 8.1 15.9 7 17.5 7H21" /><path d="m18.5 4.5 2.5 2.5-2.5 2.5M18.5 14.5l2.5 2.5-2.5 2.5" /></>,
  next: <><path d="M4 12h13" /><path d="m12 6 6 6-6 6" /><path d="M20.5 5v14" /></>,
  cards: <><rect x="3" y="6.5" width="13" height="14" rx="2" /><path d="M8 3.5h11a2 2 0 0 1 2 2v11" /></>,
  timer: <><circle cx="12" cy="13.5" r="7.5" /><path d="M12 9.5v4l2.5 1.5M9.5 2.5h5" /></>,
  alert: <><path d="M12 3.5 2.5 20h19z" /><path d="M12 10v4.5M12 17.2v.3" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.7v.3" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" /></>,
  download: <><path d="M12 4v11M7 10.5l5 5 5-5M4 20h16" /></>,
  upload: <><path d="M12 15.5V4.5M7 9l5-5 5 5M4 20h16" /></>,
  play: <path d="M7 4.5v15l12-7.5z" />,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>,
  image: <><rect x="3" y="4.5" width="18" height="15" rx="2" /><circle cx="8.5" cy="9.5" r="1.6" /><path d="m21 16-5-5-8.5 8.5" /></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" /><path d="M8 7.5h8M8 11h6" /></>,
  map: <><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="12" cy="18" r="2.5" /><path d="M7.5 8 11 15.8M16.5 8 13 15.8M8.5 6h7" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>,
  undo: <><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></>,
  shield: <><path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6z" /><path d="m8.8 12 2.3 2.3 4.3-4.6" /></>,
  print: <><path d="M7 9V3.5h10V9" /><rect x="3.5" y="9" width="17" height="8" rx="1.5" /><path d="M7 14.5h10v6H7z" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></>,
  checklist: <><path d="m3.5 6 1.8 1.8L8.5 4.5M3.5 13l1.8 1.8 3.2-3.3" /><path d="M11.5 6.5h9M11.5 13.5h9M4.5 19.5h.01M11.5 19.5h9" /></>,
};

export default function Icon({ name, size = 22, className = '', strokeWidth = 1.8 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false" className={className}
    >
      {PATHS[name] || null}
    </svg>
  );
}
