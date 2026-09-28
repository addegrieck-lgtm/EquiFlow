/**
 * Extraction d'informations à partir du texte reconnu (OCR) d'une facture, ordonnance, etc.
 * Chaque champ porte un niveau de confiance ; l'utilisateur valide TOUJOURS avant enregistrement.
 */
import type { CareType, DocumentCategory, Horse, Professional, Trade } from '../../domain/models';
import { normalize } from '../../lib/format';

export type Confidence = 'high' | 'medium' | 'low';

export interface Extracted<T> {
  value: T;
  confidence: Confidence;
}

export interface ScanResult {
  date?: Extracted<string>;
  nextDue?: Extracted<string>;
  amountCents?: Extracted<number>;
  careType?: Extracted<CareType>;
  trade?: Extracted<Trade>;
  category?: Extracted<DocumentCategory>;
  horseId?: Extracted<string>;
  professionalId?: Extracted<string>;
  siret?: Extracted<string>;
  product?: Extracted<string>;
}

const MONTHS: Record<string, number> = {
  janvier: 1, janv: 1, fevrier: 2, fevr: 2, fev: 2, mars: 3, avril: 4, avr: 4, mai: 5, juin: 6,
  juillet: 7, juil: 7, aout: 8, septembre: 9, sept: 9, octobre: 10, oct: 10, novembre: 11, nov: 11, decembre: 12, dec: 12,
};

const pad = (n: number) => String(n).padStart(2, '0');

function validDate(y: number, m: number, d: number): string | undefined {
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return undefined;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return undefined; // 31/02 → invalide
  return `${y}-${pad(m)}-${pad(d)}`;
}

interface FoundDate {
  iso: string;
  index: number;
}

/** Toutes les dates du texte : 28/09/2026, 28-09-26, 28.09.2026, 28 septembre 2026, 2026-09-28. */
export function findDates(text: string): FoundDate[] {
  const out: FoundDate[] = [];
  const norm = normalize(text);
  for (const m of norm.matchAll(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})\b/g)) {
    const iso = validDate(Number(m[3]), Number(m[2]), Number(m[1]));
    if (iso) out.push({ iso, index: m.index ?? 0 });
  }
  for (const m of norm.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    const iso = validDate(Number(m[1]), Number(m[2]), Number(m[3]));
    if (iso) out.push({ iso, index: m.index ?? 0 });
  }
  for (const m of norm.matchAll(/\b(\d{1,2})(?:er)?\s+([a-z]{3,9})\.?\s+(\d{4})\b/g)) {
    const month = MONTHS[m[2]];
    const iso = month ? validDate(Number(m[3]), month, Number(m[1])) : undefined;
    if (iso) out.push({ iso, index: m.index ?? 0 });
  }
  return out.sort((a, b) => a.index - b.index);
}

const NEXT_WORDS = /(prochain|prochaine|rappel|a revoir|a renouveler|next|avant le|valable jusqu)/;
const DATE_WORDS = /(date|facture|le |du |emis|fait a)/;

/** Montants : « 85,00 € », « 1 234,56 EUR », « TOTAL TTC 85.00 ». */
export function findAmounts(text: string): { cents: number; index: number; weight: number }[] {
  const lines = text.split(/\r?\n/);
  const out: { cents: number; index: number; weight: number }[] = [];
  let offset = 0;
  for (const line of lines) {
    const n = normalize(line);
    const weight = /(net a payer|total ttc|montant ttc|total a payer|reste a payer)/.test(n)
      ? 3
      : /(total|montant|a payer|ttc)/.test(n) && !/(ht|tva)\b/.test(n.replace(/ttc/g, ''))
        ? 2
        : /(€|eur)/.test(n)
          ? 1
          : 0;
    for (const m of line.matchAll(/(\d{1,3}(?:[  .]\d{3})*|\d+)[,.](\d{2})(?!\d)\s*(€|eur)?/gi)) {
      const intPart = m[1].replace(/[  .]/g, '');
      const cents = Number(intPart) * 100 + Number(m[2]);
      if (cents > 0 && cents < 10_000_000) out.push({ cents, index: offset + (m.index ?? 0), weight: weight + (m[3] ? 1 : 0) });
    }
    for (const m of line.matchAll(/(\d{1,6})\s*(€|eur)\b/gi)) {
      const cents = Number(m[1]) * 100;
      if (cents > 0) out.push({ cents, index: offset + (m.index ?? 0), weight: weight + 1 });
    }
    offset += line.length + 1;
  }
  return out;
}

const CARE_KEYWORDS: [CareType, RegExp][] = [
  ['farrier', /(marechal|ferrure|ferrage|parage|fers?\b|deferr)/],
  ['vaccination', /(vaccin|grippe|rhinopneumonie|tetanos|equilis|proteq|rappel vaccinal)/],
  ['deworming', /(vermifug|equest|eqvalan|strongid|ivermectine|moxidectine|praziquantel|pyrantel|coproscopie)/],
  ['dental', /(dentist|dentaire|surdent|rapage|dent de loup|bouche)/],
  ['osteopath', /(osteo)/],
  ['massage', /(massage|masseur|shiatsu)/],
  ['vet_visit', /(veterinaire|clinique|consultation|visite|echographie|radiographie|dvm)/],
];

const TRADE_FOR_CARE: Partial<Record<CareType, Trade>> = {
  farrier: 'farrier',
  vaccination: 'vet',
  deworming: 'vet',
  vet_visit: 'vet',
  dental: 'dentist',
  osteopath: 'osteopath',
  massage: 'massage',
};

const CATEGORY_KEYWORDS: [DocumentCategory, RegExp][] = [
  ['prescription', /(ordonnance|prescription|posologie)/],
  ['invoice', /(facture|invoice|net a payer|total ttc|reglement)/],
  ['insurance', /(assurance|contrat|attestation d.assurance|police n)/],
  ['passport', /(passeport|document d.identification|ueln|sire)/],
  ['certificate', /(certificat|attestation)/],
  ['competition', /(engagement|concours|classement|epreuve)/],
];

const PRODUCT_RE = /(equest(?: pramox)?|eqvalan(?: duo)?|strongid|equimax|noromectin|equilis \w+|proteq \w+|panacur|duphafral)/i;

function findName<T extends { id: string; name: string }>(norm: string, items: T[]): T | undefined {
  // Les noms les plus longs d'abord (« Spirit du Bois » avant « Spirit »).
  return [...items]
    .filter((i) => i.name.trim().length >= 3)
    .sort((a, b) => b.name.length - a.name.length)
    .find((i) => new RegExp(`\\b${normalize(i.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(norm));
}

export function extractFromText(text: string, ctx: { horses: Horse[]; professionals: Professional[]; today: string }): ScanResult {
  const norm = normalize(text);
  const result: ScanResult = {};

  // Dates : la prochaine échéance est celle précédée d'un mot comme « rappel », « prochain ».
  const dates = findDates(text).filter((d) => d.iso <= '2100-01-01');
  for (const d of dates) {
    const before = norm.slice(Math.max(0, d.index - 40), d.index);
    if (!result.nextDue && NEXT_WORDS.test(before)) {
      result.nextDue = { value: d.iso, confidence: 'medium' };
    }
  }
  const past = dates.filter((d) => d.iso <= ctx.today && d.iso !== result.nextDue?.value);
  if (past.length) {
    const labelled = past.find((d) => DATE_WORDS.test(norm.slice(Math.max(0, d.index - 20), d.index)));
    const pick = labelled ?? past[0];
    result.date = { value: pick.iso, confidence: labelled ? 'high' : past.length === 1 ? 'medium' : 'low' };
  }

  // Montant : le plus « total » ; à poids égal, le plus élevé.
  const amounts = findAmounts(text);
  if (amounts.length) {
    const best = amounts.sort((a, b) => b.weight - a.weight || b.cents - a.cents)[0];
    result.amountCents = { value: best.cents, confidence: best.weight >= 3 ? 'high' : best.weight >= 2 ? 'medium' : 'low' };
  }

  // Type d'intervention et métier.
  const hits = CARE_KEYWORDS.map(([type, re]) => ({ type, n: norm.match(new RegExp(re, 'g'))?.length ?? 0 })).filter((h) => h.n > 0);
  if (hits.length) {
    // Un vaccin ou un vermifuge prime sur une simple « visite » vétérinaire.
    const specific = hits.filter((h) => h.type !== 'vet_visit');
    const best = (specific.length ? specific : hits).sort((a, b) => b.n - a.n)[0];
    result.careType = { value: best.type, confidence: best.n >= 2 ? 'high' : 'medium' };
    const trade = TRADE_FOR_CARE[best.type];
    if (trade) result.trade = { value: trade, confidence: result.careType.confidence };
  }

  const cat = CATEGORY_KEYWORDS.find(([, re]) => re.test(norm));
  result.category = cat ? { value: cat[0], confidence: 'medium' } : { value: 'other', confidence: 'low' };

  const product = text.match(PRODUCT_RE);
  if (product) result.product = { value: product[0].trim(), confidence: 'medium' };

  const siret = norm.match(/\b(\d{3}\s?\d{3}\s?\d{3}\s?\d{5})\b/);
  if (siret) result.siret = { value: siret[1].replace(/\s/g, ''), confidence: 'medium' };

  const h = findName(norm, ctx.horses);
  if (h) result.horseId = { value: h.id, confidence: 'high' };
  else if (ctx.horses.length === 1) result.horseId = { value: ctx.horses[0].id, confidence: 'low' };

  const p = findName(norm, ctx.professionals);
  if (p) result.professionalId = { value: p.id, confidence: 'high' };

  return result;
}
