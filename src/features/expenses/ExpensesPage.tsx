import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { navigate, toHash } from '../../app/router';
import { db } from '../../data/db';
import { useExpenses, useHorses, useProfessionals } from '../../data/hooks';
import { create, update } from '../../data/repo';
import { EXPENSE_LABELS, options } from '../../domain/labels';
import type { ExpenseCategory } from '../../domain/models';
import { BarChart, Button, Card, ConfirmButton, EmptyState, HBarList, ListRow, PageHeader, Section, SelectField, StatTile, TextField, toast, toastError, Segmented, Badge } from '../../design/components';
import { formatMonth, formatMonthShort, monthKey, todayIso, formatShort, endOfMonth } from '../../lib/dates';
import { formatMoney, parseMoney } from '../../lib/format';
import { deleteExpense } from '../../services/actions';
import { byCategory, expandExpenses, filterOccurrences, monthlySeries, realMonthlyCost, sumCents, type ExpenseOccurrence } from '../../services/expenses';
import { centsToInput, DateField, HorseSelect, MoneyField, ProSelect, SaveBar } from '../shared';

/** Ouvre le formulaire de dépense, pré-rempli pour un cheval. */
export function newExpense(horseId?: string) {
  window.location.hash = toHash('more', 'expenses', 'new') + (horseId ? `?horse=${horseId}` : '');
}

export function ExpensesRoute({ path }: { path: string[] }) {
  if (path[0] === 'new') return <ExpenseEditPage />;
  if (path[0]) return <ExpenseEditPage id={path[0]} />;
  return <ExpensesPage />;
}

function ExpensesPage() {
  const horses = useHorses() ?? [];
  const [horseId, setHorseId] = useState<string>();
  return (
    <>
      <PageHeader title="Mes dépenses" backHref={toHash('more')} actions={<Button icon="plus" onClick={() => navigate('more', 'expenses', 'new')}>Ajouter</Button>} />
      {horses.length > 1 && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <HorseSelect horses={horses} value={horseId} onChange={setHorseId} allowNone label="Cheval" />
        </div>
      )}
      <ExpenseList horseId={horseId} withStats />
    </>
  );
}

/** Statistiques + liste des dépenses, pour tous les chevaux ou un seul (onglet du dossier). */
export function ExpenseList({ horseId, withStats = true }: { horseId?: string; withStats?: boolean }) {
  const expenses = useExpenses();
  const horses = useHorses() ?? [];
  const [category, setCategory] = useState<ExpenseCategory | ''>('');
  const today = todayIso();
  const occ = useMemo(() => filterOccurrences(expandExpenses(expenses ?? [], today), { horseId }), [expenses, horseId, today]);
  if (!expenses) return null;

  if (!occ.length)
    return (
      <EmptyState icon="euro" title="Aucune dépense" action={<Button icon="plus" onClick={() => newExpense(horseId)}>Ajouter une dépense</Button>}>
        Pension, vétérinaire, maréchal, alimentation… Découvrez le coût réel de votre cheval, mois par mois.
      </EmptyState>
    );

  const month = sumCents(filterOccurrences(occ, { from: `${monthKey(today)}-01`, to: today }));
  const year = sumCents(filterOccurrences(occ, { from: `${today.slice(0, 4)}-01-01`, to: today }));
  const series = monthlySeries(occ, 12, today);
  const real = realMonthlyCost(occ, today, 6);
  const yearCats = byCategory(filterOccurrences(occ, { from: `${today.slice(0, 4)}-01-01`, to: today }));
  const listed = category ? occ.filter((o) => o.expense.category === category) : occ;
  const months = [...new Set(listed.map((o) => monthKey(o.date)))];
  const horseName = (id?: string) => horses.find((h) => h.id === id)?.name;

  return (
    <>
      {withStats && (
        <>
          <Section title="Vue d’ensemble">
            <div className="stat-grid">
              <StatTile label="Ce mois-ci" value={formatMoney(month, 'EUR', false)} />
              <StatTile label={`Depuis janvier ${today.slice(0, 4)}`} value={formatMoney(year, 'EUR', false)} />
            </div>
          </Section>
          {real.months > 0 && (
            <Section title="Coût réel du cheval">
              <Card className="stack">
                <div className="spread">
                  <span className="muted small">Moyenne mensuelle sur {real.months} mois</span>
                  <strong className="display money" style={{ fontSize: 28 }}>{formatMoney(real.totalCents, 'EUR', false)}<span className="small muted"> /mois</span></strong>
                </div>
                <HBarList items={real.byCategory.map((c) => ({ label: EXPENSE_LABELS[c.category], value: c.cents, display: formatMoney(c.cents, 'EUR', false) }))} />
              </Card>
            </Section>
          )}
          <Section title="Évolution sur 12 mois">
            <Card>
              <BarChart
                summary={`Dépenses mensuelles : ${series.map((s) => `${formatMonth(s.month)} ${formatMoney(s.cents)}`).join(', ')}`}
                data={series.map((s) => ({ label: formatMonthShort(s.month).replace('.', '').slice(0, 3), value: s.cents, title: `${formatMonth(s.month)} : ${formatMoney(s.cents)}`, highlight: s.month === monthKey(today) }))}
              />
            </Card>
          </Section>
          {yearCats.length > 0 && (
            <Section title={`Par catégorie · ${today.slice(0, 4)}`}>
              <Card>
                <HBarList items={yearCats.map((c) => ({ label: EXPENSE_LABELS[c.category], value: c.cents, display: formatMoney(c.cents, 'EUR', false) }))} />
              </Card>
            </Section>
          )}
        </>
      )}
      <Section
        title="Historique"
        action={
          <button type="button" className="link-btn" onClick={() => newExpense(horseId)}>
            + Ajouter
          </button>
        }
      >
        <SelectField label="Filtrer par catégorie" value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory | '')} options={[{ value: '', label: 'Toutes les catégories' }, ...options(EXPENSE_LABELS)]} />
        {months.slice(0, 18).map((m) => {
          const items = listed.filter((o) => monthKey(o.date) === m);
          return (
            <div key={m}>
              <div className="day-head spread">
                <span>{formatMonth(m)}</span>
                <span className="money">{formatMoney(sumCents(items))}</span>
              </div>
              <Card className="card--flush">
                {items.map((o, i) => (
                  <ExpenseRow key={`${o.expense.id}-${i}`} o={o} horseName={horseId ? undefined : horseName(o.expense.horseId)} />
                ))}
              </Card>
            </div>
          );
        })}
      </Section>
    </>
  );
}

function ExpenseRow({ o, horseName }: { o: ExpenseOccurrence; horseName?: string }) {
  const e = o.expense;
  return (
    <ListRow
      icon="euro"
      title={e.label || EXPENSE_LABELS[e.category]}
      subtitle={[formatShort(o.date), EXPENSE_LABELS[e.category], horseName, e.monthly ? 'mensuelle' : undefined].filter(Boolean).join(' · ')}
      trailing={<strong className="money">{formatMoney(o.amountCents)}</strong>}
      href={toHash('more', 'expenses', e.id)}
    />
  );
}

function ExpenseEditPage({ id }: { id?: string }) {
  const horses = useHorses() ?? [];
  const pros = useProfessionals() ?? [];
  const existing = useLiveQuery(() => (id ? db.expenses.get(id) : undefined), [id]);
  const presetHorse = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('horse') ?? undefined;
  const [state, setState] = useState<{ horseId?: string; date?: string; amount: string; category: ExpenseCategory; label: string; professionalId?: string; monthly: boolean; endDate?: string }>();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  if (id && existing === undefined) return null;

  const s = state ?? {
    horseId: existing?.horseId ?? presetHorse ?? horses[0]?.id,
    date: existing?.date ?? todayIso(),
    amount: centsToInput(existing?.amountCents),
    category: existing?.category ?? 'boarding',
    label: existing?.label ?? '',
    professionalId: existing?.professionalId,
    monthly: existing?.monthly ?? false,
    endDate: existing?.endDate,
  };
  const set = (p: Partial<typeof s>) => setState({ ...s, ...p });

  const save = async () => {
    const amountCents = parseMoney(s.amount);
    if (!amountCents) return setError('Montant invalide (ex. 350 ou 85,50)');
    if (!s.date) return setError('Date requise');
    setSaving(true);
    try {
      const data = { horseId: s.horseId, date: s.date, amountCents, currency: 'EUR', category: s.category, label: s.label, professionalId: s.professionalId, monthly: s.monthly, endDate: s.monthly ? s.endDate : undefined };
      if (existing) await update('expenses', existing.id, data);
      else await create('expenses', data);
      toast(existing ? 'Dépense mise à jour' : 'Dépense ajoutée');
      history.length > 1 ? history.back() : navigate('more', 'expenses');
    } catch (e) {
      toastError(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title={existing ? 'Modifier la dépense' : 'Nouvelle dépense'} backHref={toHash('more', 'expenses')} />
      <div className="form">
        <MoneyField value={s.amount} onChange={(v) => { set({ amount: v }); setError(undefined); }} error={error} />
        <SelectField label="Catégorie" value={s.category} onChange={(e) => set({ category: e.target.value as ExpenseCategory })} options={options(EXPENSE_LABELS)} />
        <DateField label={s.monthly ? 'À partir du' : 'Date'} value={s.date} onChange={(v) => set({ date: v })} />
        <Segmented
          label="Fréquence"
          value={s.monthly ? 'monthly' : 'once'}
          onChange={(v) => set({ monthly: v === 'monthly' })}
          options={[
            { value: 'once', label: 'Ponctuelle' },
            { value: 'monthly', label: 'Tous les mois' },
          ]}
        />
        {s.monthly && (
          <>
            <p className="small muted">Idéal pour la pension ou l’assurance : comptée automatiquement chaque mois.</p>
            <DateField label="Jusqu’au (facultatif)" value={s.endDate} onChange={(v) => set({ endDate: v })} hint="Renseignez la fin quand vous changez de pension : l’historique est conservé." />
            {existing?.monthly && !s.endDate && (
              <Button variant="secondary" onClick={() => set({ endDate: endOfMonth(todayIso()) })}>
                Arrêter à la fin de ce mois
              </Button>
            )}
          </>
        )}
        {horses.length > 0 && <HorseSelect horses={horses} value={s.horseId} allowNone onChange={(v) => set({ horseId: v })} />}
        <TextField label="Libellé" value={s.label} onChange={(e) => set({ label: e.target.value })} placeholder="Pension de septembre, 2 sacs de granulés…" />
        <ProSelect pros={pros} value={s.professionalId} onChange={(v) => set({ professionalId: v })} />
        {existing?.careRecordId && <Badge tone="neutral">Liée à un soin du dossier</Badge>}
        {existing && (
          <ConfirmButton
            onConfirm={async () => {
              await deleteExpense(existing);
              toast('Dépense supprimée');
              navigate('more', 'expenses');
            }}
          >
            Supprimer {existing.monthly ? 'cette dépense mensuelle (tous les mois)' : 'la dépense'}
          </ConfirmButton>
        )}
      </div>
      <SaveBar onSave={save} saving={saving} />
    </>
  );
}
