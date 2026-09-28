import { addDays, addMonths, diffDays, endOfMonth, lastMonths, relativeDays, startOfWeek, formatDate, formatLong } from '../src/lib/dates';
import { formatDuration, formatMoney, normalize, parseMoney } from '../src/lib/format';

describe('dates civiles', () => {
  it('ajoute des jours à travers les mois, années et changements d’heure', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30'); // passage à l'heure d'été
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('ajoute des mois sans déborder', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
  });

  it('calcule les écarts en jours', () => {
    expect(diffDays('2026-09-28', '2026-10-12')).toBe(14);
    expect(diffDays('2026-10-12', '2026-09-28')).toBe(-14);
  });

  it('trouve le lundi de la semaine', () => {
    expect(startOfWeek('2026-09-28')).toBe('2026-09-28'); // lundi
    expect(startOfWeek('2026-10-04')).toBe('2026-09-28'); // dimanche
  });

  it('fin de mois et derniers mois', () => {
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28');
    expect(lastMonths(3, '2026-01-15')).toEqual(['2025-11', '2025-12', '2026-01']);
  });

  it('formate en français', () => {
    expect(formatDate('2026-09-28')).toBe('28/09/2026');
    expect(formatLong('2026-10-01')).toBe('jeudi 1er octobre');
    expect(formatLong('2026-10-11')).toBe('dimanche 11 octobre');
    expect(relativeDays('2026-10-12', '2026-09-28')).toBe('dans 14 jours');
    expect(relativeDays('2026-09-29', '2026-09-28')).toBe('demain');
    expect(relativeDays('2026-09-25', '2026-09-28')).toBe('il y a 3 jours');
  });
});

describe('montants et formats', () => {
  it('lit les saisies de montant', () => {
    expect(parseMoney('85')).toBe(8500);
    expect(parseMoney('85,50')).toBe(8550);
    expect(parseMoney('1 234.5 €')).toBe(123450);
    expect(parseMoney('abc')).toBeUndefined();
    expect(parseMoney('0')).toBeUndefined();
    expect(parseMoney('1,234')).toBeUndefined();
  });

  it('affiche les montants en euros', () => {
    expect(formatMoney(8500).replace(/\s/g, ' ')).toBe('85 €');
    expect(formatMoney(8550).replace(/\s/g, ' ')).toBe('85,50 €');
  });

  it('affiche les durées', () => {
    expect(formatDuration(40)).toBe('40 min');
    expect(formatDuration(95)).toBe('1 h 35');
    expect(formatDuration(120)).toBe('2 h');
  });

  it('normalise pour la recherche', () => {
    expect(normalize('  Maréchal-Ferrant ')).toBe('marechal-ferrant');
  });
});
