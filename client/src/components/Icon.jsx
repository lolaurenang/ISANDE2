/**
 * The nine icons named in the design chapter, drawn as inline SVG so the
 * app carries no icon-font dependency and keeps the rounded line style.
 */
const PATHS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  calendar: 'M7 3v3M17 3v3M3.5 9h17M5 6h14a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 19 21H5a1.5 1.5 0 0 1-1.5-1.5v-12A1.5 1.5 0 0 1 5 6z',
  schedule: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  manager: 'M3 5.5A1.5 1.5 0 0 1 4.5 4h15A1.5 1.5 0 0 1 21 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 14.5zM9 20h6',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0',
  bell: 'M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7M13.7 20a2 2 0 0 1-3.4 0',
  add: 'M12 8v8M8 12h8M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  remove: 'M8 12h8M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  menu: 'M4 7h16M4 12h16M4 17h16',
  back: 'M14 6l-6 6 6 6',
  next: 'M10 6l6 6-6 6',
  check: 'M5 13l4 4L19 7',
  logout: 'M15 12H4m0 0 3.5-3.5M4 12l3.5 3.5M11 5h7a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-7',
  report: 'M7 3h8l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM15 3v4h4M9 13h6M9 17h6M9 9h2',
  download: 'M12 4v11m0 0-4-4m4 4 4-4M5 19h14',
};

export default function Icon({ name, size = 22, className = '' }) {
  const d = PATHS[name] || PATHS.home;
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}
