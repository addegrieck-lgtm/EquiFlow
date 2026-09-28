import { answer, detectIntent } from '../src/services/ai/engine';
import { parsePeriod } from '../src/services/ai/periods';
import { planWeek } from '../src/services/ai/planner';
import type { AiContext } from '../src/services/ai/types';
import { normalize } from '../src/lib/format';
import { care, event, expense, horse, pro, session } from './fixtures';

const TODAY = '2026-09-28'; // lundi
const spirit = horse({ id: 'spirit', name: 'Spirit', discipline: 'jumping', birthYear: 2015, breed: 'Selle Français', sex: 'gelding' });
const ulysse = horse({ id: 'ulysse', name: 'Ulysse' });
const dupont = pro({ id: 'dupont', name: 'Jean Dupont', trade: 'farrier', phone: '06 00 00 00 01', lat: 48.9, lon: 2.3 });
const vet = pro({ id: 'vet', name: 'Dr Martin', trade: 'vet', phone: '06 00 00 00 02', lat: 48.86, lon: 2.35 });

function ctx(p: Partial<AiContext> = {}): AiContext {
  return {
    today: TODAY,
    profile: { id: 'p', ownerId: 'local', createdAt: '', updatedAt: '', version: 1, firstName: 'Adrien', role: 'owner', goals: ['progress'] },
    horses: [spirit, ulysse],
    activeHorseId: 'spirit',
    care: [
      care({ horseId: 'spirit', type: 'farrier', date: '2026-08-10', professionalId: 'dupont', expenseId: 'e-far', details: { shoeing: 'fers antérieurs' } }),
      care({ horseId: 'spirit', type: 'farrier', date: '2026-06-20', professionalId: 'dupont' }),
      care({ horseId: 'spirit', type: 'vaccination', date: '2025-10-01' }),
    ],
    rules: [],
    reminderStates: [],
    expenses: [
      expense({ id: 'e-pension', horseId: 'spirit', date: '2026-01-01', amountCents: 35000, category: 'boarding', monthly: true }),
      expense({ id: 'e-far', horseId: 'spirit', date: '2026-08-10', amountCents: 8500, category: 'farrier' }),
      expense({ horseId: 'spirit', date: '2025-12-15', amountCents: 20000, category: 'vet' }),
      expense({ horseId: 'ulysse', date: '2026-03-01', amountCents: 5000, category: 'equipment' }),
    ],
    sessions: [
      session({ horseId: 'spirit', date: '2026-09-27', durationMin: 45, exercises: ['Transitions'], horseFeeling: 4, notes: 'Très bonne écoute' }),
      session({ horseId: 'spirit', date: '2026-09-25', durationMin: 60, discipline: 'dressage', exercises: ['Transitions', 'Cercles et voltes'] }),
      session({ horseId: 'spirit', date: '2026-09-22', durationMin: 30 }),
      session({ horseId: 'spirit', date: '2026-09-18', durationMin: 40 }),
      session({ horseId: 'spirit', date: '2026-09-15', durationMin: 50 }),
      session({ horseId: 'spirit', date: '2026-09-10', durationMin: 50 }),
    ],
    events: [event({ date: '2026-10-01', time: '18:00', title: 'Cours avec Thomas', horseId: 'spirit', type: 'coach' })],
    professionals: [dupont, vet],
    documents: [],
    ...p,
  };
}

const text = (a: ReturnType<typeof answer>) => a.blocks.map((b) => [b.text, ...(b.items ?? [])].join(' ')).join(' | ').replace(/ | /g, ' ');

describe('EQUIFLOW AI — questions du cahier des charges', () => {
  it('« Quand Spirit a-t-il vu le maréchal ? »', () => {
    const a = answer('Quand Spirit a-t-il vu le maréchal ?', ctx());
    expect(a.intent).toBe('care');
    expect(a.blocks[0].kind).toBe('data');
    expect(text(a)).toContain('10/08/2026');
    expect(text(a)).toContain('Jean Dupont');
    expect(text(a)).toContain('85 €');
    expect(a.blocks.some((b) => b.kind === 'calc' && b.text.includes('28/09/2026'))).toBe(true); // 10/08 + 49 j
  });

  it('« Combien Spirit m’a coûté depuis janvier ? »', () => {
    const a = answer('Combien Spirit m’a coûté depuis janvier ?', ctx());
    expect(a.intent).toBe('cost');
    expect(a.blocks[0].kind).toBe('calc');
    // 9 mois de pension (janv.→sept.) + maréchal ; la dépense véto de décembre 2025 est exclue
    expect(text(a)).toContain('3 235 €');
    expect(text(a)).toContain('depuis janvier');
    expect(text(a)).toContain('Pension : 3 150 €');
  });

  it('« Quel est le coût moyen de Spirit depuis janvier ? »', () => {
    const a = answer('Quel est le coût moyen de Spirit depuis janvier ?', ctx());
    expect(text(a)).toMatch(/en moyenne 359,44 € par mois/);
  });

  it('« Quels soins sont prévus cette semaine ? »', () => {
    const a = answer('Quels soins sont prévus cette semaine ?', ctx());
    expect(a.intent).toBe('schedule');
    const t = text(a);
    expect(t).toContain('Cours avec Thomas');
    expect(t).toContain('Maréchal-ferrant de Spirit — 28/09/2026');
    expect(t).toContain('Vaccination de Spirit — 01/10/2026');
  });

  it('« Résume les 5 dernières séances. »', () => {
    const a = answer('Résume les 5 dernières séances.', ctx());
    expect(a.intent).toBe('sessions');
    expect(a.blocks.find((b) => b.kind === 'data')!.items).toHaveLength(5);
    expect(text(a)).toContain('5 séances, 3 h 45 au total');
    expect(text(a)).toContain('Transitions');
    expect(a.blocks.at(-1)!.kind).toBe('calc');
  });

  it('« Prépare-moi une semaine d’entraînement. »', () => {
    const a = answer('Prépare-moi une semaine d’entraînement.', ctx());
    expect(a.intent).toBe('plan');
    expect(a.blocks[0].kind).toBe('suggestion');
    const action = a.actions.find((x) => x.type === 'addPlan');
    expect(action && action.type === 'addPlan' && action.items.map((i) => i.date)).toEqual(['2026-09-29', '2026-10-01', '2026-10-03', '2026-10-04']);
  });

  it('« Quels professionnels sont disponibles autour de moi ? »', () => {
    const a = answer('Quels professionnels sont disponibles autour de moi ?', ctx({ home: { lat: 48.8566, lon: 2.3522 } }));
    expect(a.intent).toBe('pros');
    expect(a.blocks[0].items![0]).toContain('Dr Martin'); // le plus proche
    expect(a.blocks.some((b) => b.kind === 'uncertain' && b.text.includes('disponibilités'))).toBe(true);
    expect(a.actions.some((x) => x.type === 'link' && x.href.startsWith('#/more/nearby'))).toBe(true);
  });
});

describe('EQUIFLOW AI — honnêteté et sécurité', () => {
  it('signale une urgence et ne donne jamais de diagnostic', () => {
    const a = answer('Spirit a une colique et se roule, que faire ?', ctx());
    expect(a.intent).toBe('safety');
    expect(a.blocks[0].kind).toBe('warning');
    expect(a.blocks[0].text).toMatch(/urgence/);
    expect(text(a)).toMatch(/ne peux pas établir de diagnostic/);
    expect(a.actions[0]).toEqual({ type: 'call', label: 'Appeler Dr Martin', phone: '06 00 00 00 02' });
  });

  it('oriente vers le vétérinaire pour une boiterie', () => {
    const a = answer('Spirit boite depuis hier, c’est grave ?', ctx());
    expect(a.intent).toBe('safety');
    expect(a.blocks[0].text).not.toMatch(/urgence/);
    expect(text(a)).toContain('contactez votre vétérinaire');
  });

  it('dit quand une donnée manque au lieu d’inventer', () => {
    const a = answer('Quand Spirit a-t-il vu le dentiste ?', ctx());
    expect(a.blocks[0].kind).toBe('uncertain');
    expect(text(a)).toContain('Aucun enregistrement');
  });

  it('précise le cheval choisi quand il n’est pas nommé', () => {
    const a = answer('Quand a-t-il vu le maréchal ?', ctx());
    expect(a.blocks[0]).toMatchObject({ kind: 'uncertain' });
    expect(a.blocks[0].text).toContain('je réponds pour Spirit');
  });

  it('répond pour le bon cheval quand il est nommé', () => {
    const a = answer('Combien Ulysse m’a coûté cette année ?', ctx());
    expect(text(a)).toContain('50 €');
  });

  it('ne propose pas de programme pour un cheval blessé', () => {
    const a = answer('Prépare-moi une semaine d’entraînement pour Spirit', ctx({ horses: [{ ...spirit, status: 'injured' }] }));
    expect(a.blocks[0].kind).toBe('warning');
    expect(a.actions).toHaveLength(0);
  });

  it('invite à ajouter un cheval s’il n’y en a aucun', () => {
    const a = answer('Combien ça m’a coûté ?', ctx({ horses: [] }));
    expect(a.blocks[0].kind).toBe('uncertain');
  });

  it('propose des exemples quand la question est incomprise', () => {
    expect(answer('Bonjour !', ctx()).intent).toBe('help');
  });
});

describe('compréhension', () => {
  it.each([
    ['depuis janvier', '2026-01-01', TODAY],
    ['depuis le 15 mars', '2026-03-15', TODAY],
    ['depuis novembre', '2025-11-01', TODAY],
    ['en août', '2026-08-01', '2026-08-31'],
    ['le mois dernier', '2026-08-01', '2026-08-31'],
    ['la semaine prochaine', '2026-10-05', '2026-10-11'],
    ['cette semaine', '2026-09-28', '2026-10-04'],
    ['sur les 3 derniers mois', '2026-06-29', TODAY],
    ['en 2025', '2025-01-01', '2025-12-31'],
    ['l’année dernière', '2025-01-01', '2025-12-31'],
  ])('période « %s »', (q, from, to) => {
    expect(parsePeriod(normalize(q), TODAY)).toMatchObject({ from, to });
  });

  it.each([
    ['combien de séances ce mois-ci', 'sessions'],
    ['quelles dépenses en maréchal', 'cost'],
    ['prochain vaccin de Spirit', 'care'],
    ['où est le passeport', 'documents'],
    ['quel âge a Spirit', 'horseInfo'],
    ['quel rendez-vous demain', 'schedule'],
  ])('intention de « %s »', (q, intent) => {
    expect(detectIntent(normalize(q))).toBe(intent);
  });

  it('allège le programme en reprise et respecte la charge', () => {
    const p = planWeek(spirit, ['leisure'], [], TODAY);
    expect(p.items).toHaveLength(3);
    expect(p.items[0].durationMin).toBe(30); // 40 × 0,75
    expect(p.notes[0]).toMatch(/reprise progressive/);
  });
});
