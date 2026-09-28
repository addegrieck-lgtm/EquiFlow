/** Montant en centimes → « 1 234,50 € ». */
export function formatMoney(cents: number, currency = 'EUR', withDecimals = cents % 100 !== 0): string {
  return (cents / 100).toLocaleString('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  });
}

/** Saisie utilisateur « 85 », « 85,50 », « 1 234.5 € » → centimes (ou undefined si invalide). */
export function parseMoney(input: string): number | undefined {
  const cleaned = input.replace(/[\s €]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return undefined;
  const cents = Math.round(Number(cleaned) * 100);
  return cents > 0 ? cents : undefined;
}

/** 95 → « 1 h 35 », 40 → « 40 min ». */
export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n > 1 ? many : one}`;
}

/** Normalise pour la recherche : minuscules, sans accents. */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 ** 2).toFixed(1).replace('.', ',')} Mo`;
}
