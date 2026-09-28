/**
 * Monogramme EQUIFLOW : un « E » dont la barre centrale devient une courbe de mouvement
 * (trajectoire dans la carrière), soulignée d'un filet doré.
 * La même géométrie est utilisée par scripts/generate-icons.mjs pour les icônes de l'app.
 */
export function LogoMark({ size = 40, title = 'EQUIFLOW' }: { size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      <rect width="64" height="64" rx="16" fill="var(--color-brand)" />
      <path
        d="M20 16h24M20 48h24M20 16v32"
        stroke="var(--color-on-brand)"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M20 32c6-5.5 12-5.5 17 0s8.5 5 11-1"
        stroke="var(--color-gold)"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="wordmark">
      <LogoMark size={32} title="" />
      <span>EQUIFLOW</span>
    </span>
  );
}
