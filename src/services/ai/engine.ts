/**
 * EQUIFLOW AI — moteur local (SPEC §K).
 * 1. compréhension (intention + cheval + période) → 2. outils sur les données autorisées →
 * 3. calculs déterministes → 4. réponse étiquetée (donnée / calcul / suggestion / incertain).
 * Aucun appel réseau : les réponses sont exactes, reproductibles et testées.
 */
import { CARE_LABELS, DISCIPLINE_LABELS, DOCUMENT_LABELS, EXPENSE_LABELS, HORSE_STATUS_LABELS, SEX_LABELS, TRADE_LABELS } from '../../domain/labels';
import type { CareType, DocumentCategory, ExpenseCategory, Horse, Trade } from '../../domain/models';
import { addDays, ageFromYear, formatDate, formatLong, relativeDays } from '../../lib/dates';
import { formatDuration, formatMoney, normalize, plural } from '../../lib/format';
import { expandEvents } from '../calendar';
import { byCategory, expandExpenses, filterOccurrences, sumCents } from '../expenses';
import { formatDistance, sortByDistance } from '../geo';
import { averageFeeling, disciplineBreakdown } from '../progress';
import { computeDueItems } from '../reminders';
import { monthsCovered, parsePeriod } from './periods';
import { planWeek } from './planner';
import type { AiAction, AiAnswer, AiContext, AnswerBlock, Intent } from './types';

// --- Vocabulaire --------------------------------------------------------------------------------

const CARE_WORDS: [CareType, RegExp][] = [
  ['farrier', /(marechal|ferrure|ferre|parage|fers\b)/],
  ['vaccination', /(vaccin)/],
  ['deworming', /(vermifug)/],
  ['dental', /(dentist|dents?\b|dentaire)/],
  ['osteopath', /(osteo)/],
  ['massage', /(massage|masseur)/],
  ['vet_visit', /(veto|veterinaire)/],
];

const TRADE_WORDS: [Trade, RegExp][] = [
  ['vet', /(veto|veterinaire)/],
  ['farrier', /(marechal)/],
  ['dentist', /(dentiste)/],
  ['osteopath', /(osteo)/],
  ['massage', /(masseu|massage)/],
  ['transport', /(transport)/],
  ['boarding', /(pension|ecurie)/],
  ['coach', /(coach|moniteur|enseignant)/],
  ['photographer', /(photograph)/],
  ['groom', /(groom)/],
];

const EXPENSE_WORDS: [ExpenseCategory, RegExp][] = [
  ['boarding', /(pension)/],
  ['vet', /(veto|veterinaire)/],
  ['farrier', /(marechal|ferrure)/],
  ['feed', /(aliment|nourriture|foin|granule)/],
  ['equipment', /(materiel|equipement|sellerie)/],
  ['competition', /(concours|engagement)/],
  ['transport', /(transport|camion|van)/],
  ['coaching', /(coach|cours|lecon)/],
  ['insurance', /(assurance)/],
];

const DOC_WORDS: [DocumentCategory, RegExp][] = [
  ['passport', /(passeport)/],
  ['invoice', /(facture)/],
  ['prescription', /(ordonnance)/],
  ['insurance', /(assurance)/],
  ['certificate', /(certificat)/],
  ['competition', /(concours)/],
];

/** Signes d'urgence : message d'urgence en premier, sans détour. */
const URGENT = /(colique|se roule|couche et ne|ne se releve|hemorragi|saigne beaucoup|fracture|ne pose plus|tremble|convulsion|detresse|ne respire|ventre gonfle|choc)/;
/** Sujets médicaux : information générale uniquement, orientation vers le vétérinaire. */
const MEDICAL = /(boite|boiterie|fievre|temperature|tousse|toux|jetage|plaie|blesse|gonfl|oedeme|diarrhee|maigri|ne mange|malade|symptome|diagnosti|douleur|a mal|souffre|abces|fourbure|crevasse|gale de boue|yeux? qui coule|larmoi|est-ce grave|que faire si|quel medicament|quel traitement|posologie|dose de)/;

const HEALTH_DISCLAIMER =
  'Je ne peux pas établir de diagnostic ni conseiller de médicament. Si vous observez un changement de comportement, de locomotion ou d’appétit, contactez votre vétérinaire : lui seul peut examiner votre cheval.';

const find = <T extends string>(q: string, table: [T, RegExp][]): T | undefined => table.find(([, re]) => re.test(q))?.[0];

// --- Point d'entrée -----------------------------------------------------------------------------

export function detectIntent(q: string): Intent {
  if (URGENT.test(q) || MEDICAL.test(q)) return 'safety';
  if (/(prepare|programme|planifie|organise|propose|plan d)/.test(q) && /(semaine|entrainement|seances?|programme)/.test(q)) return 'plan';
  if (/(resume|resumer|bilan|recap|dernieres? seances?|combien de seances|mes seances|statistiques|progression)/.test(q)) return 'sessions';
  if (/(combien|cout|coute|depense|budget|prix|frais|argent)/.test(q)) return 'cost';
  if (/(prevu|a venir|au programme|planning|agenda|rendez.vous|\brdv\b|echeance|rappel|a faire|cette semaine|semaine prochaine|demain|aujourd)/.test(q) && !find(q, CARE_WORDS)) return 'schedule';
  if (/(soins)/.test(q) && /(prevu|semaine|mois|venir|demain|aujourd)/.test(q)) return 'schedule';
  if (/(professionnel|\bpros?\b|contact|numero|telephone|appeler|disponible|autour|proche|pres de|trouver un)/.test(q)) return 'pros';
  if (find(q, CARE_WORDS)) return 'care';
  if (/(document|papier|passeport|facture|ordonnance|assurance|certificat)/.test(q)) return 'documents';
  if (/(quel age|age de|\bage\b|race|taille|robe|puce|sire|ueln|ne en|nee en|infos? sur)/.test(q)) return 'horseInfo';
  return 'help';
}

export function answer(question: string, ctx: AiContext): AiAnswer {
  const q = normalize(question).replace(/[’']/g, ' ');
  const intent = detectIntent(q);
  const horse = resolveHorse(q, ctx);
  const res: AiAnswer = { intent, horseId: horse?.id, blocks: [], actions: [] };

  if (!ctx.horses.length && intent !== 'safety' && intent !== 'help' && intent !== 'pros') {
    res.blocks.push({ kind: 'uncertain', text: 'Aucun cheval n’est encore enregistré : ajoutez-en un pour que je puisse répondre à partir de son dossier.' });
    res.actions.push({ type: 'link', label: 'Ajouter un cheval', href: '#/horse/new' });
    return res;
  }

  switch (intent) {
    case 'safety':
      return safety(q, ctx, res);
    case 'plan':
      return plan(ctx, horse, res);
    case 'sessions':
      return sessionsSummary(q, ctx, horse, res);
    case 'cost':
      return cost(q, ctx, horse, res);
    case 'schedule':
      return schedule(q, ctx, res);
    case 'care':
      return care(q, ctx, horse, res);
    case 'pros':
      return pros(q, ctx, res);
    case 'documents':
      return documents(q, ctx, horse, res);
    case 'horseInfo':
      return horseInfo(ctx, horse, res);
    default:
      return help(res);
  }
}

function resolveHorse(q: string, ctx: AiContext): Horse | undefined {
  const named = [...ctx.horses]
    .sort((a, b) => b.name.length - a.name.length)
    .find((h) => new RegExp(`\\b${normalize(h.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(q));
  return named ?? ctx.horses.find((h) => h.id === ctx.activeHorseId) ?? ctx.horses[0];
}

const horseName = (ctx: AiContext, id?: string) => ctx.horses.find((h) => h.id === id)?.name ?? '—';
const proName = (ctx: AiContext, id?: string) => ctx.professionals.find((p) => p.id === id)?.name;

/** Précise quel cheval a été choisi quand l'utilisateur en a plusieurs et ne l'a pas nommé. */
function horseNote(q: string, ctx: AiContext, horse: Horse | undefined, blocks: AnswerBlock[]) {
  if (horse && ctx.horses.length > 1 && !q.includes(normalize(horse.name))) {
    blocks.push({ kind: 'uncertain', text: `Vous n’avez pas précisé le cheval : je réponds pour ${horse.name} (cheval sélectionné).` });
  }
}

// --- Outils -------------------------------------------------------------------------------------

function safety(q: string, ctx: AiContext, res: AiAnswer): AiAnswer {
  const vets = ctx.professionals.filter((p) => p.trade === 'vet' && p.phone);
  if (URGENT.test(q)) {
    res.blocks.push({
      kind: 'warning',
      text: 'Ce que vous décrivez peut être une urgence. Appelez votre vétérinaire (ou le vétérinaire de garde) immédiatement, sans attendre.',
    });
  }
  res.blocks.push({ kind: 'warning', text: HEALTH_DISCLAIMER });
  res.blocks.push({
    kind: 'suggestion',
    text: 'En attendant, notez ce que vous observez (heure, comportement, température si vous savez la prendre) : ces informations aideront le vétérinaire.',
  });
  for (const v of vets.slice(0, 2)) res.actions.push({ type: 'call', label: `Appeler ${v.name}`, phone: v.phone! });
  if (!vets.length) {
    res.blocks.push({ kind: 'uncertain', text: 'Aucun vétérinaire avec numéro dans votre carnet.' });
    res.actions.push({ type: 'link', label: 'Trouver un vétérinaire proche', href: '#/more/nearby/vet' });
  }
  return res;
}

function plan(ctx: AiContext, horse: Horse | undefined, res: AiAnswer): AiAnswer {
  if (!horse) return help(res);
  const p = planWeek(horse, ctx.profile?.goals ?? [], ctx.sessions, ctx.today);
  if (p.blocked) {
    res.blocks.push({ kind: 'warning', text: p.blocked });
    return res;
  }
  res.blocks.push({
    kind: 'suggestion',
    text: `Proposition de semaine pour ${horse.name}${horse.discipline ? ` (${DISCIPLINE_LABELS[horse.discipline].toLowerCase()})` : ''} :`,
    items: p.items.map((i) => `${capitalize(formatLong(i.date))} — ${i.title}, ${formatDuration(i.durationMin)}`),
  });
  for (const n of p.notes) res.blocks.push({ kind: 'suggestion', text: n });
  if (p.items.length) res.actions.push({ type: 'addPlan', horseId: horse.id, items: p.items });
  return res;
}

function sessionsSummary(q: string, ctx: AiContext, horse: Horse | undefined, res: AiAnswer): AiAnswer {
  horseNote(q, ctx, horse, res.blocks);
  const period = parsePeriod(q, ctx.today);
  const n = Number(q.match(/(\d{1,2}) (?:dernieres? )?seances?/)?.[1] ?? 5);
  let list = ctx.sessions.filter((s) => s.horseId === horse?.id).sort((a, b) => b.date.localeCompare(a.date));
  if (period) list = list.filter((s) => s.date >= period.from && s.date <= period.to);
  else list = list.slice(0, n);

  if (!list.length) {
    res.blocks.push({ kind: 'uncertain', text: `Aucune séance enregistrée pour ${horse?.name}${period ? ` ${period.label}` : ''}.` });
    res.actions.push({ type: 'link', label: 'Ajouter une séance', href: '#/sessions/new' });
    return res;
  }
  res.blocks.push({
    kind: 'data',
    text: period ? `Séances de ${horse?.name} ${period.label} :` : `Les ${plural(list.length, 'dernière séance', 'dernières séances')} de ${horse?.name} :`,
    items: list.map(
      (s) =>
        `${formatDate(s.date)} — ${DISCIPLINE_LABELS[s.discipline]}, ${formatDuration(s.durationMin)}${s.exercises.length ? ` · ${s.exercises.slice(0, 3).join(', ')}` : ''}${s.notes ? ` · « ${s.notes.slice(0, 80)}${s.notes.length > 80 ? '…' : ''} »` : ''}`,
    ),
  });
  const total = list.reduce((m, s) => m + s.durationMin, 0);
  const disc = disciplineBreakdown(list);
  const feeling = averageFeeling(list, 'horseFeeling');
  const exercises = topExercises(list.flatMap((s) => s.exercises));
  res.blocks.push({
    kind: 'calc',
    text: `${plural(list.length, 'séance', 'séances')}, ${formatDuration(total)} au total (${formatDuration(Math.round(total / list.length))} en moyenne). Discipline principale : ${DISCIPLINE_LABELS[disc[0].discipline].toLowerCase()}.${feeling ? ` Ressenti moyen du cheval : ${String(feeling).replace('.', ',')}/5.` : ''}${exercises.length ? ` Exercices les plus travaillés : ${exercises.join(', ')}.` : ''}`,
  });
  return res;
}

function topExercises(list: string[]): string[] {
  const counts = new Map<string, number>();
  for (const e of list) counts.set(e, (counts.get(e) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([e]) => e);
}

function cost(q: string, ctx: AiContext, horse: Horse | undefined, res: AiAnswer): AiAnswer {
  const allHorses = /(tous|toutes|mes chevaux|au total|en tout)/.test(q) && !q.includes(normalize(horse?.name ?? '§'));
  if (!allHorses) horseNote(q, ctx, horse, res.blocks);
  const period = parsePeriod(q, ctx.today);
  const category = find(q, EXPENSE_WORDS);
  const occ = filterOccurrences(expandExpenses(ctx.expenses, ctx.today), {
    horseId: allHorses ? undefined : horse?.id,
    from: period?.from,
    to: period ? (period.to < ctx.today ? period.to : ctx.today) : undefined,
    category,
  });
  const who = allHorses ? 'vos chevaux' : horse?.name;
  const what = category ? ` en ${EXPENSE_LABELS[category].toLowerCase()}` : '';
  const when = period?.label ?? 'depuis le début de votre historique';

  if (!occ.length) {
    res.blocks.push({ kind: 'uncertain', text: `Aucune dépense${what} enregistrée pour ${who} ${when}.` });
    res.actions.push({ type: 'link', label: 'Ajouter une dépense', href: '#/more/expenses/new' });
    return res;
  }
  const total = sumCents(occ);
  const wantsAverage = /(moyen|moyenne|par mois|mensuel)/.test(q);
  const first = occ.reduce((m, o) => (o.date < m ? o.date : m), occ[0].date);
  const months = monthsCovered(period ?? { from: first, to: ctx.today, label: '' }, ctx.today, first);
  const avg = Math.round(total / Math.max(1, months));

  res.blocks.push({
    kind: 'calc',
    text: wantsAverage
      ? `${capitalize(who ?? '')} vous a coûté en moyenne ${formatMoney(avg)} par mois${what} ${when} (${formatMoney(total)} sur ${plural(months, 'mois', 'mois')}).`
      : `${capitalize(who ?? '')} vous a coûté ${formatMoney(total)}${what} ${when}, soit ${formatMoney(avg)} par mois en moyenne sur ${plural(months, 'mois', 'mois')}.`,
  });
  if (!category) {
    res.blocks.push({
      kind: 'data',
      text: 'Répartition :',
      items: byCategory(occ).map((c) => `${EXPENSE_LABELS[c.category]} : ${formatMoney(c.cents)}`),
    });
  }
  if (occ.some((o) => o.expense.monthly)) {
    res.blocks.push({ kind: 'uncertain', text: 'Les dépenses mensuelles (pension, assurance…) sont comptées chaque mois depuis leur date de début.' });
  }
  res.actions.push({ type: 'link', label: 'Voir les dépenses', href: '#/more/expenses' });
  return res;
}

function schedule(q: string, ctx: AiContext, res: AiAnswer): AiAnswer {
  const period = parsePeriod(q, ctx.today) ?? { from: ctx.today, to: addDays(ctx.today, 6), label: 'dans les 7 prochains jours' };
  const from = period.from < ctx.today ? ctx.today : period.from;
  const due = computeDueItems(ctx.horses, ctx.care, ctx.rules, ctx.reminderStates, ctx.today);
  const overdue = due.filter((d) => d.status === 'overdue');
  const inRange = due.filter((d) => d.dueDate >= from && d.dueDate <= period.to);
  const events = expandEvents(ctx.events, from, period.to).filter((o) => !o.done);

  if (overdue.length) {
    res.blocks.push({
      kind: 'calc',
      text: 'En retard :',
      items: overdue.map((d) => `${CARE_LABELS[d.careType]} de ${horseName(ctx, d.horseId)} — prévu le ${formatDate(d.dueDate)} (${relativeDays(d.dueDate, ctx.today)})`),
    });
  }
  if (events.length) {
    res.blocks.push({
      kind: 'data',
      text: `Au programme ${period.label} :`,
      items: events.map(
        (o) => `${capitalize(formatLong(o.date))}${o.event.time ? ` à ${o.event.time.replace(':', 'h')}` : ''} — ${o.event.title}${o.event.horseId ? ` (${horseName(ctx, o.event.horseId)})` : ''}`,
      ),
    });
  }
  if (inRange.length) {
    res.blocks.push({
      kind: 'calc',
      text: `Échéances de soins ${period.label} :`,
      items: inRange.map((d) => `${CARE_LABELS[d.careType]} de ${horseName(ctx, d.horseId)} — ${formatDate(d.dueDate)}${d.source === 'rule' ? ' (estimée d’après l’intervalle habituel)' : ''}`),
    });
  }
  if (!overdue.length && !events.length && !inRange.length) {
    res.blocks.push({ kind: 'data', text: `Rien de prévu ${period.label}.` });
  }
  res.actions.push({ type: 'link', label: 'Ouvrir l’agenda', href: '#/agenda' });
  return res;
}

function care(q: string, ctx: AiContext, horse: Horse | undefined, res: AiAnswer): AiAnswer {
  horseNote(q, ctx, horse, res.blocks);
  const type = find(q, CARE_WORDS)!;
  const label = CARE_LABELS[type].toLowerCase();
  const records = ctx.care.filter((r) => r.horseId === horse?.id && r.type === type).sort((a, b) => b.date.localeCompare(a.date));
  const due = computeDueItems(horse ? [horse] : [], ctx.care, ctx.rules, ctx.reminderStates, ctx.today).find((d) => d.careType === type);
  const wantsNext = /(prochain|prochaine|a faire|a prevoir|doit|quand faut|echeance|refaire)/.test(q);

  if (!records.length) {
    res.blocks.push({ kind: 'uncertain', text: `Aucun enregistrement « ${label} » pour ${horse?.name}. Je ne peux donc pas estimer la prochaine échéance.` });
    res.actions.push({ type: 'link', label: 'Ajouter un soin', href: `#/horse/${horse?.id}/care/new/${type}` });
    return res;
  }
  const last = records[0];
  const pro = proName(ctx, last.professionalId);
  const expense = ctx.expenses.find((e) => e.id === last.expenseId);
  if (!wantsNext || !due) {
    res.blocks.push({
      kind: 'data',
      text: `Dernier enregistrement « ${label} » pour ${horse?.name} : le ${formatDate(last.date)} (${relativeDays(last.date, ctx.today)})${pro ? `, avec ${pro}` : ''}${last.details.shoeing ? `, ${last.details.shoeing}` : ''}${last.details.product ? `, ${last.details.product}` : ''}${expense ? `, ${formatMoney(expense.amountCents)}` : ''}.`,
    });
  }
  if (due) {
    res.blocks.push({
      kind: due.source === 'manual' ? 'data' : 'calc',
      text: `Prochaine échéance : ${formatDate(due.dueDate)} (${relativeDays(due.dueDate, ctx.today)})${due.source === 'rule' ? ', estimée d’après l’intervalle habituel — à confirmer avec votre professionnel' : ''}.`,
    });
  } else if (wantsNext) {
    res.blocks.push({ kind: 'uncertain', text: `Pas d’intervalle de rappel défini pour ce type de soin : je ne peux pas calculer la prochaine date.` });
  }
  if (records.length > 1) {
    res.blocks.push({ kind: 'data', text: 'Historique récent :', items: records.slice(0, 5).map((r) => `${formatDate(r.date)}${proName(ctx, r.professionalId) ? ` — ${proName(ctx, r.professionalId)}` : ''}`) });
  }
  return res;
}

function pros(q: string, ctx: AiContext, res: AiAnswer): AiAnswer {
  const trade = find(q, TRADE_WORDS);
  let list = ctx.professionals.filter((p) => !trade || p.trade === trade);
  const nearby = /(autour|proche|pres de|a cote|plus pres)/.test(q);
  if (ctx.home) list = sortByDistance(list, ctx.home);
  if (list.length) {
    res.blocks.push({
      kind: 'data',
      text: `${trade ? TRADE_LABELS[trade] : 'Professionnels'} de votre carnet${ctx.home ? ', du plus proche au plus loin' : ''} :`,
      items: list.slice(0, 8).map((p) => {
        const dist = 'distanceKm' in p && typeof p.distanceKm === 'number' ? ` · ${formatDistance(p.distanceKm)}` : '';
        return `${p.name} (${TRADE_LABELS[p.trade]})${p.phone ? ` · ${p.phone}` : ''}${dist}`;
      }),
    });
    const withPhone = list.filter((p) => p.phone).slice(0, 2);
    for (const p of withPhone) res.actions.push({ type: 'call', label: `Appeler ${p.name}`, phone: p.phone! });
  } else {
    res.blocks.push({ kind: 'uncertain', text: `Aucun ${trade ? TRADE_LABELS[trade].toLowerCase() : 'professionnel'} dans votre carnet pour l’instant.` });
  }
  if (/(disponible|dispo|creneau)/.test(q)) {
    res.blocks.push({ kind: 'uncertain', text: 'Je ne connais pas leurs disponibilités : la réservation en ligne arrivera avec l’annuaire des professionnels (V2).' });
  }
  if (nearby || !list.length) {
    const kind = trade === 'farrier' ? 'farrier' : trade === 'boarding' ? 'stable' : 'vet';
    res.actions.push({ type: 'link', label: 'Chercher autour de moi', href: `#/more/nearby/${kind}` });
  }
  return res;
}

function documents(q: string, ctx: AiContext, horse: Horse | undefined, res: AiAnswer): AiAnswer {
  const cat = find(q, DOC_WORDS);
  const docs = ctx.documents
    .filter((d) => (!cat || d.category === cat) && (!d.horseId || d.horseId === horse?.id || /(tous|toutes)/.test(q)))
    .sort((a, b) => (b.date ?? b.createdAt).localeCompare(a.date ?? a.createdAt));
  if (!docs.length) {
    res.blocks.push({ kind: 'uncertain', text: `Aucun document${cat ? ` « ${DOCUMENT_LABELS[cat].toLowerCase()} »` : ''} enregistré${horse ? ` pour ${horse.name}` : ''}.` });
    res.actions.push({ type: 'link', label: 'Scanner un document', href: '#/scan' });
    return res;
  }
  res.blocks.push({
    kind: 'data',
    text: `Documents${cat ? ` « ${DOCUMENT_LABELS[cat].toLowerCase()} »` : ''} :`,
    items: docs.slice(0, 8).map((d) => `${d.title}${d.date ? ` — ${formatDate(d.date)}` : ''}${d.expiresAt ? ` · expire le ${formatDate(d.expiresAt)}` : ''}`),
  });
  res.actions.push({ type: 'link', label: 'Ouvrir les documents', href: horse ? `#/horse/${horse.id}/documents` : '#/horse' });
  return res;
}

function horseInfo(ctx: AiContext, horse: Horse | undefined, res: AiAnswer): AiAnswer {
  if (!horse) return help(res);
  const age = ageFromYear(horse.birthYear, ctx.today);
  const facts = [
    age !== undefined ? `Âge : ${age} ans (né en ${horse.birthYear})` : undefined,
    horse.sex ? `Sexe : ${SEX_LABELS[horse.sex]}` : undefined,
    horse.breed ? `Race : ${horse.breed}` : undefined,
    horse.color ? `Robe : ${horse.color}` : undefined,
    horse.heightCm ? `Taille : ${horse.heightCm} cm` : undefined,
    horse.discipline ? `Discipline : ${DISCIPLINE_LABELS[horse.discipline]}` : undefined,
    horse.ueln ? `UELN / SIRE : ${horse.ueln}` : undefined,
    horse.microchip ? `Puce : ${horse.microchip}` : undefined,
    `Statut : ${HORSE_STATUS_LABELS[horse.status]}`,
  ].filter((x): x is string => Boolean(x));
  res.blocks.push({ kind: 'data', text: `Fiche de ${horse.name} :`, items: facts });
  if (facts.length < 4) res.blocks.push({ kind: 'uncertain', text: 'Plusieurs informations manquent : complétez la fiche pour des réponses plus précises.' });
  return res;
}

function help(res: AiAnswer): AiAnswer {
  res.intent = 'help';
  res.blocks.push({
    kind: 'uncertain',
    text: 'Je n’ai pas compris la question. Je réponds à partir de vos données, par exemple :',
    items: [
      'Quand Spirit a-t-il vu le maréchal ?',
      'Combien Spirit m’a coûté depuis janvier ?',
      'Quels soins sont prévus cette semaine ?',
      'Résume les 5 dernières séances.',
      'Prépare-moi une semaine d’entraînement.',
      'Quels vétérinaires sont autour de moi ?',
    ],
  });
  return res;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const SUGGESTED_QUESTIONS = [
  'Quand a-t-il vu le maréchal ?',
  'Combien m’a-t-il coûté depuis janvier ?',
  'Quels soins sont prévus cette semaine ?',
  'Résume les 5 dernières séances',
  'Prépare-moi une semaine d’entraînement',
  'Quel est le coût moyen par mois cette année ?',
];

export type { AiAction };
