import { computeDueItems } from '../src/services/reminders';
import { byCategory, expandExpenses, filterOccurrences, monthlySeries, realMonthlyCost, sumCents } from '../src/services/expenses';
import { weekSummary, weeklyStreak, disciplineBreakdown, gaitTotals, averageFeeling } from '../src/services/progress';
import { buildIcs, expandEvents, occurrenceDates, toRrule } from '../src/services/calendar';
import { care, event, expense, horse, session } from './fixtures';

const TODAY = '2026-09-28'; // lundi

describe('échéances des soins', () => {
  const spirit = horse({ id: 'spirit' });

  it('calcule la prochaine échéance à partir du dernier soin et de l’intervalle par défaut', () => {
    const items = computeDueItems(
      [spirit],
      [care({ horseId: 'spirit', type: 'farrier', date: '2026-08-01' }), care({ horseId: 'spirit', type: 'farrier', date: '2026-09-10' })],
      [],
      [],
      TODAY,
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ careType: 'farrier', lastDate: '2026-09-10', dueDate: '2026-10-29', status: 'ok', source: 'rule' });
  });

  it('classe en « bientôt » dans le préavis et « en retard » après la date', () => {
    const items = computeDueItems(
      [spirit],
      [
        care({ horseId: 'spirit', type: 'vaccination', date: '2025-10-12' }), // → 2026-10-12, 14 j, préavis 30 j
        care({ horseId: 'spirit', type: 'deworming', date: '2026-05-01' }), // → 2026-08-29, en retard
      ],
      [],
      [],
      TODAY,
    );
    expect(items.map((i) => [i.careType, i.status, i.daysLeft])).toEqual([
      ['deworming', 'overdue', -30],
      ['vaccination', 'soon', 14],
    ]);
  });

  it('respecte une date saisie à la main, une règle personnalisée ou désactivée', () => {
    const base = { ownerId: 'local', createdAt: '', updatedAt: '', version: 1 };
    const items = computeDueItems(
      [spirit],
      [
        care({ horseId: 'spirit', type: 'dental', date: '2026-01-10', nextDueAt: '2026-10-01' }),
        care({ horseId: 'spirit', type: 'farrier', date: '2026-09-01' }),
        care({ horseId: 'spirit', type: 'osteopath', date: '2026-01-01' }),
      ],
      [
        { ...base, id: 'r1', horseId: 'spirit', careType: 'farrier', intervalDays: 35, noticeDays: 5, enabled: true },
        { ...base, id: 'r2', horseId: 'spirit', careType: 'osteopath', intervalDays: 180, noticeDays: 10, enabled: false },
      ],
      [],
      TODAY,
    );
    expect(items.map((i) => [i.careType, i.dueDate, i.source])).toEqual([
      ['dental', '2026-10-01', 'manual'],
      ['farrier', '2026-10-06', 'rule'],
    ]);
  });

  it('masque les échéances faites, ignorées ou reportées, et ignore les chevaux vendus', () => {
    const base = { ownerId: 'local', createdAt: '', updatedAt: '', version: 1 };
    const records = [
      care({ horseId: 'spirit', type: 'farrier', date: '2026-08-01' }), // due 2026-09-19
      care({ horseId: 'spirit', type: 'vaccination', date: '2025-10-01' }), // due 2026-10-01
      care({ horseId: 'sold', type: 'farrier', date: '2026-08-01' }),
    ];
    const states = [
      { ...base, id: 's1', key: 'care:spirit:farrier:2026-09-19', status: 'done' as const },
      { ...base, id: 's2', key: 'care:spirit:vaccination:2026-10-01', status: 'snoozed' as const, snoozedUntil: '2026-09-30' },
    ];
    expect(computeDueItems([spirit, horse({ id: 'sold', status: 'sold' })], records, [], states, TODAY)).toHaveLength(0);
    expect(computeDueItems([spirit], records, [], states, '2026-09-30')).toHaveLength(1);
  });
});

describe('dépenses', () => {
  const list = [
    expense({ date: '2026-01-05', amountCents: 35000, category: 'boarding', monthly: true, horseId: 'h' }),
    expense({ date: '2026-09-10', amountCents: 8500, category: 'farrier', horseId: 'h' }),
    expense({ date: '2026-03-15', amountCents: 12000, category: 'vet', horseId: 'h' }),
    expense({ date: '2026-04-02', amountCents: 6000, category: 'equipment', horseId: 'autre' }),
  ];

  it('déplie les dépenses mensuelles jusqu’à aujourd’hui (pas de mois futur)', () => {
    const occ = expandExpenses([list[0]], '2026-09-28');
    expect(occ).toHaveLength(9); // janvier → septembre
    expect(expandExpenses([list[0]], '2026-09-03')).toHaveLength(8); // le 5 septembre n'est pas encore passé
    expect(expandExpenses([{ ...list[0], endDate: '2026-03-31' }], TODAY)).toHaveLength(3);
  });

  it('additionne par période, cheval et catégorie', () => {
    const occ = expandExpenses(list, TODAY);
    expect(sumCents(filterOccurrences(occ, { from: '2026-01-01', to: TODAY, horseId: 'h' }))).toBe(9 * 35000 + 8500 + 12000);
    expect(sumCents(filterOccurrences(occ, { category: 'farrier' }))).toBe(8500);
    expect(byCategory(filterOccurrences(occ, { horseId: 'h' }))[0]).toEqual({ category: 'boarding', cents: 315000 });
  });

  it('produit une série mensuelle', () => {
    const s = monthlySeries(expandExpenses(list, TODAY), 3, TODAY);
    expect(s).toEqual([
      { month: '2026-07', cents: 35000 },
      { month: '2026-08', cents: 35000 },
      { month: '2026-09', cents: 43500 },
    ]);
  });

  it('calcule le coût réel mensuel sur les mois complets depuis la première dépense', () => {
    const occ = expandExpenses([expense({ date: '2026-07-01', amountCents: 35000, category: 'boarding', monthly: true }), expense({ date: '2026-08-10', amountCents: 8000, category: 'farrier' })], TODAY);
    const cost = realMonthlyCost(occ, TODAY, 6);
    expect(cost.months).toBe(2); // juillet et août (septembre en cours exclu)
    expect(cost.totalCents).toBe(Math.round((70000 + 8000) / 2));
    expect(cost.byCategory).toEqual([
      { category: 'boarding', cents: 35000 },
      { category: 'farrier', cents: 4000 },
    ]);
  });

  it('utilise le mois en cours quand c’est le seul disponible', () => {
    const cost = realMonthlyCost(expandExpenses([expense({ date: '2026-09-02', amountCents: 9000, category: 'feed' })], TODAY), TODAY);
    expect(cost).toMatchObject({ months: 1, totalCents: 9000 });
    expect(realMonthlyCost([], TODAY).months).toBe(0);
  });
});

describe('progression', () => {
  const s = [
    session({ horseId: 'h', date: '2026-09-28', durationMin: 40, horseFeeling: 4 }),
    session({ horseId: 'h', date: '2026-09-22', durationMin: 60, discipline: 'dressage', horseFeeling: 5 }),
    session({ horseId: 'h', date: '2026-09-24', durationMin: 30 }),
    session({ horseId: 'h', date: '2026-09-16', durationMin: 45 }),
    session({ horseId: 'h', date: '2026-08-30', durationMin: 45 }),
  ];

  it('résume la semaine et la compare à la précédente', () => {
    expect(weekSummary(s, TODAY)).toEqual({ count: 1, minutes: 40, previousCount: 2, previousMinutes: 90 });
  });

  it('compte les semaines consécutives avec au moins une séance', () => {
    expect(weeklyStreak(s, TODAY)).toBe(3); // 28/09, 21/09, 14/09 ; la semaine du 07/09 est vide
    expect(weeklyStreak(s.slice(1), TODAY)).toBe(2); // semaine en cours vide : on part de la précédente
  });

  it('répartit par discipline, allures et ressenti', () => {
    expect(disciplineBreakdown(s)[0]).toEqual({ discipline: 'jumping', count: 4, minutes: 160 });
    expect(gaitTotals(s.slice(0, 2))).toEqual({ walk: 20, trot: 40, canter: 30 });
    expect(averageFeeling(s, 'horseFeeling')).toBe(4.5);
    expect(averageFeeling(s, 'riderFeeling')).toBeUndefined();
  });
});

describe('agenda', () => {
  it('déplie les récurrences hebdomadaires et mensuelles', () => {
    const weekly = event({ date: '2026-09-01', recurrence: { freq: 'weekly', interval: 2 } });
    expect(occurrenceDates(weekly, '2026-09-20', '2026-10-31')).toEqual(['2026-09-29', '2026-10-13', '2026-10-27']);

    const monthly = event({ date: '2026-01-31', recurrence: { freq: 'monthly', interval: 1, until: '2026-04-30' } });
    expect(occurrenceDates(monthly, '2026-01-01', '2026-12-31')).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);

    const once = event({ date: '2026-10-02' });
    expect(occurrenceDates(once, '2026-10-01', '2026-10-31')).toEqual(['2026-10-02']);
    expect(occurrenceDates(once, '2026-11-01', '2026-11-30')).toEqual([]);
  });

  it('trie les occurrences et indique celles déjà faites', () => {
    const occ = expandEvents(
      [event({ date: '2026-10-02', time: '18:00', title: 'B' }), event({ date: '2026-10-02', time: '09:00', title: 'A', doneDates: ['2026-10-02'] })],
      '2026-10-01',
      '2026-10-31',
    );
    expect(occ.map((o) => [o.event.title, o.done])).toEqual([
      ['A', true],
      ['B', false],
    ]);
  });

  it('exporte un fichier iCalendar valide avec rappel', () => {
    const e = event({ date: '2026-10-02', time: '18:00', durationMin: 45, title: 'Séance; plat', recurrence: { freq: 'weekly', interval: 1 } });
    const ics = buildIcs(
      [
        { uid: 'a', title: e.title, date: e.date, time: e.time, durationMin: e.durationMin, rrule: toRrule(e), alertMin: 60 },
        { uid: 'b', title: 'Vaccin de Spirit', date: '2026-10-12', alertMin: 24 * 60 },
      ],
      new Date('2026-09-28T08:00:00Z'),
    );
    expect(ics).toContain('BEGIN:VCALENDAR\r\n');
    expect(ics).toContain('DTSTART:20261002T180000');
    expect(ics).toContain('DTEND:20261002T184500');
    expect(ics).toContain('SUMMARY:Séance\\; plat');
    expect(ics).toContain('RRULE:FREQ=WEEKLY');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261012');
    expect(ics).toContain('TRIGGER:-PT1440M');
    expect(ics.split('\r\n').every((l) => l.length <= 75)).toBe(true);
  });
});
