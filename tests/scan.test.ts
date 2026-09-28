import { extractFromText, findAmounts, findDates } from '../src/services/scan/extract';
import { horse, pro } from './fixtures';

const ctx = {
  horses: [horse({ id: 'spirit', name: 'Spirit' }), horse({ id: 'ulysse', name: 'Ulysse du Val' })],
  professionals: [pro({ id: 'dupont', name: 'Jean Dupont', trade: 'farrier' })],
  today: '2026-09-30',
};

describe('SCAN — extraction', () => {
  it('lit une facture de maréchal (exemple du cahier des charges)', () => {
    const text = `JEAN DUPONT - Maréchal-ferrant
SIRET 123 456 789 00012
Facture n° 2026-118
Date : 28/09/2026
Cheval : SPIRIT
Ferrure antérieurs + parage postérieurs     70,83
TVA 20 %                                    14,17
TOTAL TTC                                   85,00 €`;
    const r = extractFromText(text, ctx);
    expect(r.date).toEqual({ value: '2026-09-28', confidence: 'high' });
    expect(r.amountCents).toEqual({ value: 8500, confidence: 'high' });
    expect(r.careType?.value).toBe('farrier');
    expect(r.trade?.value).toBe('farrier');
    expect(r.category?.value).toBe('invoice');
    expect(r.horseId).toEqual({ value: 'spirit', confidence: 'high' });
    expect(r.professionalId?.value).toBe('dupont');
    expect(r.siret?.value).toBe('12345678900012');
  });

  it('distingue la date de la facture de la date de rappel d’un vaccin', () => {
    const text = `Clinique vétérinaire des Pins
Le 12 septembre 2026
Vaccination grippe + tétanos (Proteq Flu-TE) — Ulysse du Val
Prochain rappel : 12/03/2027
Net à payer : 96,40 €`;
    const r = extractFromText(text, ctx);
    expect(r.date?.value).toBe('2026-09-12');
    expect(r.nextDue?.value).toBe('2027-03-12');
    expect(r.careType?.value).toBe('vaccination');
    expect(r.amountCents?.value).toBe(9640);
    expect(r.horseId?.value).toBe('ulysse');
    expect(r.product?.value).toMatch(/Proteq Flu/i);
  });

  it('reconnaît une ordonnance de vermifuge', () => {
    const r = extractFromText('ORDONNANCE\n03/09/2026\nEquest Pramox 1 seringue', ctx);
    expect(r.category?.value).toBe('prescription');
    expect(r.careType?.value).toBe('deworming');
    expect(r.amountCents).toBeUndefined();
  });

  it('reste prudent quand le texte est pauvre', () => {
    const r = extractFromText('illisible 42', { ...ctx, horses: [ctx.horses[0]] });
    expect(r.date).toBeUndefined();
    expect(r.category).toEqual({ value: 'other', confidence: 'low' });
    expect(r.horseId).toEqual({ value: 'spirit', confidence: 'low' }); // un seul cheval : proposé, mais peu sûr
  });

  it('rejette les dates impossibles et gère les formats courts', () => {
    expect(findDates('31/02/2026 et 05.10.26').map((d) => d.iso)).toEqual(['2026-10-05']);
  });

  it('lit les montants avec séparateurs de milliers', () => {
    expect(findAmounts('Total : 1 234,56 €').map((a) => a.cents)).toContain(123456);
  });
});
