import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { toHash } from '../../app/router';
import { db } from '../../data/db';
import { CARE_ICONS, CARE_LABELS, DISCIPLINE_LABELS, DOCUMENT_LABELS, EVENT_ICONS, EXPENSE_LABELS, TRADE_LABELS } from '../../domain/labels';
import { Card, EmptyState, ListRow, PageHeader, Section, TextField, type IconName } from '../../design/components';
import { formatDate } from '../../lib/dates';
import { formatMoney, normalize } from '../../lib/format';

interface Hit {
  id: string;
  icon: IconName;
  title: string;
  subtitle?: string;
  href: string;
}

/** Recherche globale dans tout le dossier (SPEC §32), 100 % locale. */
export function SearchPage() {
  const [query, setQuery] = useState('');
  const q = normalize(query);
  const data = useLiveQuery(async () => ({
    horses: await db.horses.toArray(),
    care: await db.careRecords.toArray(),
    docs: await db.documents.toArray(),
    sessions: await db.sessions.toArray(),
    pros: await db.professionals.toArray(),
    expenses: await db.expenses.toArray(),
    events: await db.events.toArray(),
  }), []);

  const groups: [string, Hit[]][] = [];
  if (data && q.length >= 2) {
    const horseName = (id?: string) => data.horses.find((h) => h.id === id)?.name ?? '';
    const pro = (id?: string) => data.pros.find((p) => p.id === id)?.name ?? '';
    const match = (...parts: (string | undefined)[]) => normalize(parts.filter(Boolean).join(' ')).includes(q);
    groups.push(['Chevaux', data.horses.filter((h) => match(h.name, h.breed, h.location, h.ueln, h.notes)).map((h) => ({ id: h.id, icon: 'horseshoe', title: h.name, subtitle: h.breed, href: toHash('horse', h.id) }))]);
    groups.push(['Professionnels', data.pros.filter((p) => match(p.name, TRADE_LABELS[p.trade], p.address, p.notes, p.phone)).map((p) => ({ id: p.id, icon: 'pro', title: p.name, subtitle: TRADE_LABELS[p.trade], href: toHash('more', 'pros', p.id) }))]);
    groups.push(['Soins', data.care.filter((c) => match(CARE_LABELS[c.type], c.title, c.notes, c.details.product, c.details.reason, c.details.shoeing, horseName(c.horseId), pro(c.professionalId))).map((c) => ({ id: c.id, icon: CARE_ICONS[c.type], title: `${CARE_LABELS[c.type]} · ${horseName(c.horseId)}`, subtitle: formatDate(c.date), href: toHash('horse', c.horseId, 'care', c.id) }))]);
    groups.push(['Documents', data.docs.filter((d) => match(d.title, DOCUMENT_LABELS[d.category], d.ocrText, horseName(d.horseId))).map((d) => ({ id: d.id, icon: 'document', title: d.title, subtitle: [DOCUMENT_LABELS[d.category], d.date ? formatDate(d.date) : undefined].filter(Boolean).join(' · '), href: d.horseId ? toHash('horse', d.horseId, 'doc', d.id) : toHash('horse') }))]);
    groups.push(['Séances', data.sessions.filter((s) => match(DISCIPLINE_LABELS[s.discipline], s.notes, s.exercises.join(' '), horseName(s.horseId))).map((s) => ({ id: s.id, icon: 'activity', title: `${formatDate(s.date)} · ${DISCIPLINE_LABELS[s.discipline]}`, subtitle: horseName(s.horseId), href: toHash('sessions', s.id) }))]);
    groups.push(['Dépenses', data.expenses.filter((e) => match(e.label, EXPENSE_LABELS[e.category], pro(e.professionalId))).map((e) => ({ id: e.id, icon: 'euro', title: e.label || EXPENSE_LABELS[e.category], subtitle: `${formatDate(e.date)} · ${formatMoney(e.amountCents)}`, href: toHash('more', 'expenses', e.id) }))]);
    groups.push(['Agenda', data.events.filter((e) => match(e.title, e.notes, e.location)).map((e) => ({ id: e.id, icon: EVENT_ICONS[e.type], title: e.title, subtitle: formatDate(e.date), href: toHash('agenda', 'event', e.id) }))]);
  }
  const results = groups.filter(([, hits]) => hits.length);

  return (
    <>
      <PageHeader title="Rechercher" backHref={toHash('home')} />
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <TextField label="Rechercher dans tout EQUIFLOW" type="search" autoFocus placeholder="Maréchal, vaccin, passeport, Dupont…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {q.length >= 2 && !results.length && <EmptyState icon="search" title="Aucun résultat">Essayez un autre mot : nom du cheval, du professionnel, type de soin, texte d’un document scanné…</EmptyState>}
      {results.map(([title, hits]) => (
        <Section key={title} title={`${title} (${hits.length})`}>
          <Card className="card--flush">
            {hits.slice(0, 8).map((h) => (
              <ListRow key={h.id} icon={h.icon} title={h.title} subtitle={h.subtitle} href={h.href} />
            ))}
          </Card>
        </Section>
      ))}
    </>
  );
}
