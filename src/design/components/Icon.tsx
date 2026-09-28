import type { SVGProps } from 'react';

/** Jeu d'icônes au trait (24×24, épaisseur 1,75) — dessiné pour EQUIFLOW, sans dépendance. */
const paths = {
  home: 'M3.5 10.5 12 4l8.5 6.5M5.5 9v10.5h4.75v-5.5h3.5v5.5h4.75V9',
  // fer à cheval + étampures
  horseshoe:
    'M7 20.5 5.6 15.8a8 8 0 0 1-.3-2.3V11a6.7 6.7 0 0 1 13.4 0v2.5a8 8 0 0 1-.3 2.3L17 20.5M8.9 20.5l-.9-4a6 6 0 0 1-.2-1.6V11a4.2 4.2 0 0 1 8.4 0v3.9a6 6 0 0 1-.2 1.6l-.9 4M7 20.5h1.9M15.1 20.5H17M6.6 13h.01M17.4 13h.01M7.3 9.2h.01M16.7 9.2h.01',
  activity: 'M3 12h4l2.5-6.5 5 13L17 12h4',
  calendar: 'M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5zM4 10h16M8.5 3v4M15.5 3v4',
  menu: 'M4 7h16M4 12h16M4 17h10',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6 6 18',
  chevron: 'M9.5 6l6 6-6 6',
  back: 'M14.5 6l-6 6 6 6',
  search: 'M10.8 18.1a7.3 7.3 0 1 0 0-14.6 7.3 7.3 0 0 0 0 14.6zM16 16l4.5 4.5',
  sparkle:
    'M12 3.5c.4 3.9 1.9 5.7 5.5 6.3-3.6.6-5.1 2.4-5.5 6.2-.4-3.8-1.9-5.6-5.5-6.2 3.6-.6 5.1-2.4 5.5-6.3zM18.5 15c.2 1.6.8 2.3 2.3 2.5-1.5.2-2.1.9-2.3 2.5-.2-1.6-.8-2.3-2.3-2.5 1.5-.2 2.1-.9 2.3-2.5z',
  camera:
    'M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  video: 'M4 7.5A2.5 2.5 0 0 1 6.5 5h7A2.5 2.5 0 0 1 16 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 4 16.5zM16 10.5l4.5-3v9l-4.5-3',
  document: 'M7 3.5h6.5L18 8v11a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5zM13 3.5V8.5h5M9 13h6M9 16.5h4',
  scan: 'M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M7.5 12h9',
  euro: 'M17.5 6.5a6.5 6.5 0 1 0 0 11M4.5 10.5h9M4.5 13.5h9',
  health: 'M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10zM8.5 12.5h2l1-2 1.5 4 1-2h1.5',
  bell: 'M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2h-14zM10 20.5a2 2 0 0 0 4 0',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0',
  pro: 'M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5M4 8a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 20 8v10a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18zM4 12.5h16',
  shield: 'M12 3.5 19 6v5.5c0 4.3-3 7.7-7 9-4-1.3-7-4.7-7-9V6zM9 12l2 2 4-4',
  palette:
    'M12 20.5a8.5 8.5 0 1 1 8.5-8.5c0 2.2-1.8 3.5-3.7 3.5H15a1.8 1.8 0 0 0-1.3 3 1.8 1.8 0 0 1-1.7 2zM7.5 12h.01M9.5 8h.01M14.5 8h.01',
  moon: 'M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z',
  sun: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  download: 'M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14',
  info: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM12 11v5M12 8h.01',
  check: 'M5 12.5 10 17.5 19 7',
} as const;

export type IconName = keyof typeof paths;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  /** Libellé accessible ; sans libellé l'icône est décorative. */
  label?: string;
}

export function Icon({ name, size = 24, label, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      <path d={paths[name]} />
    </svg>
  );
}
