import { useState } from 'react';
import { QuickActionsGrid } from '../../app/QuickActionsSheet';
import { navigate, toHash } from '../../app/router';
import { useActiveHorse, useDueItems, useEvents, useProfile, useSessions, useSetting, WEEKLY_GOAL_KEY } from '../../data/hooks';
import { DISCIPLINE_LABELS, EVENT_ICONS, EVENT_LABELS, HORSE_STATUS_LABELS } from '../../domain/labels';
import { Badge, Button, Card, DueBadge, EmptyState, Icon, IconButton, ListRow, PageHeader, ProgressBar, Section, Wordmark } from '../../design/components';
import { addDays, ageFromYear, formatDate, formatLong, relativeDays, todayIso } from '../../lib/dates';
import { formatDuration, plural } from '../../lib/format';
import { toggleEventDone } from '../../services/actions';
import { expandEvents } from '../../services/calendar';
import { loadLive } from '../../services/liveSession';
import { weekSummary } from '../../services/progress';
import { DueRow } from '../horse/HorsePage';
import { HorseAvatar } from '../shared';

function greeting(date: Date): string {
  const h = date.getHours();
  return h >= 18 || h < 5 ? 'Bonsoir' : 'Bonjour';
}

export function HomePage() {
  const profile = useProfile();
  const { horse, horses } = useActiveHorse();
  const due = useDueItems() ?? [];
  const events = useEvents() ?? [];
  const sessions = useSessions() ?? [];
  const goal = useSetting<number>(WEEKLY_GOAL_KEY, 3);
  const [question, setQuestion] = useState('');
  const now = new Date();
  const today = todayIso(now);

  const todayOcc = expandEvents(events, today, today);
  const nextOcc = expandEvents(events, addDays(today, 1), addDays(today, 14)).filter((o) => !o.done)[0];
  const actionable = due.filter((d) => d.status !== 'ok');
  const horseDue = horse ? due.find((d) => d.horseId === horse.id) : undefined;
  const horseSessions = horse ? sessions.filter((s) => s.horseId === horse.id) : sessions;
  const week = weekSummary(horseSessions, today);
  const live = loadLive();
  const name = (id?: string) => horses.find((h) => h.id === id)?.name;
  const age = horse ? ageFromYear(horse.birthYear, today) : undefined;
  const nothingToday = !todayOcc.length && !actionable.length;

  return (
    <>
      <div className="spread" style={{ marginBottom: 'var(--space-5)' }}>
        <Wordmark />
        <IconButton icon="search" label="Rechercher" onClick={() => navigate('search')} />
      </div>
      <PageHeader eyebrow={formatLong(today).replace(/^./, (c) => c.toUpperCase())} title={`${greeting(now)}${profile ? ` ${profile.firstName}` : ''} 👋`} />

      {live && (
        <Card className="card--brand spread" style={{ marginBottom: 'var(--space-5)' }}>
          <span className="row">
            <Icon name="clock" /> Séance en cours
          </span>
          <Button variant="secondary" onClick={() => navigate('sessions', 'live')}>
            Reprendre
          </Button>
        </Card>
      )}

      <Section title="Aujourd’hui" action={<a className="link-btn" href={toHash('agenda')}>Agenda</a>}>
        {nothingToday ? (
          <Card className="small muted">
            Rien de prévu aujourd’hui.
            {nextOcc ? (
              <>
                {' '}
                Prochain : <strong style={{ color: 'var(--color-text)' }}>{nextOcc.event.title}</strong>, {formatLong(nextOcc.date)}
                {nextOcc.event.time ? ` à ${nextOcc.event.time.replace(':', 'h')}` : ''}.
              </>
            ) : null}
          </Card>
        ) : (
          <Card className="card--flush">
            {todayOcc.map((o) => (
              <ListRow
                key={o.event.id}
                icon={EVENT_ICONS[o.event.type]}
                title={<span style={{ textDecoration: o.done ? 'line-through' : undefined }}>{`${o.event.time ? `${o.event.time.replace(':', 'h')} · ` : ''}${o.event.title}`}</span>}
                subtitle={[EVENT_LABELS[o.event.type], name(o.event.horseId)].filter(Boolean).join(' · ')}
                trailing={
                  <IconButton
                    icon="check"
                    label={o.done ? 'Marquer comme à faire' : 'Marquer comme fait'}
                    style={{ color: o.done ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                    onClick={() => toggleEventDone(o.event.id, o.date)}
                  />
                }
              />
            ))}
            {actionable.slice(0, 4).map((d) => (
              <DueRow key={d.key} item={d} showHorse={horses.length > 1 ? name(d.horseId) : undefined} />
            ))}
          </Card>
        )}
        {actionable.length > 4 && (
          <a className="link-btn" href={toHash('agenda', 'reminders')}>
            Voir les {actionable.length} rappels
          </a>
        )}
      </Section>

      <Section title="Mon cheval">
        {horse ? (
          <a href={toHash('horse', horse.id)} style={{ textDecoration: 'none', color: 'inherit' }}>
            <Card className="row" style={{ gap: 'var(--space-4)' }}>
              <HorseAvatar horse={horse} size={64} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="spread">
                  <strong style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-heading)' }}>{horse.name}</strong>
                  {horse.status !== 'active' && <Badge tone="warning">{HORSE_STATUS_LABELS[horse.status]}</Badge>}
                </div>
                <div className="small muted">{[age !== undefined ? `${age} ans` : undefined, horse.discipline ? DISCIPLINE_LABELS[horse.discipline] : undefined].filter(Boolean).join(' · ') || 'Complétez sa fiche'}</div>
                {horseDue ? (
                  <div className="row small" style={{ marginTop: 6, gap: 'var(--space-2)' }}>
                    <DueBadge status={horseDue.status} />
                    <span>
                      {formatDate(horseDue.dueDate)} · {relativeDays(horseDue.dueDate, today)}
                    </span>
                  </div>
                ) : (
                  <div className="small muted" style={{ marginTop: 6 }}>Aucune échéance à venir</div>
                )}
              </div>
            </Card>
          </a>
        ) : (
          <EmptyState icon="horseshoe" title="Ajoutez votre premier cheval" action={<Button icon="plus" onClick={() => navigate('horse', 'new')}>Ajouter un cheval</Button>}>
            Photo, race, âge, discipline : son dossier complet commence ici.
          </EmptyState>
        )}
      </Section>

      {horse && (
        <Section title="Progression de la semaine" action={<a className="link-btn" href={toHash('sessions', 'progress')}>Détails</a>}>
          <Card className="stack">
            <div className="spread">
              <strong>
                {plural(week.count, 'séance', 'séances')} / {goal}
              </strong>
              <span className="small muted">
                {formatDuration(week.minutes)}
                {week.previousCount ? ` · ${week.count >= week.previousCount ? '▲' : '▼'} vs sem. dernière` : ''}
              </span>
            </div>
            <ProgressBar value={week.count} max={goal} label="Objectif de la semaine" />
          </Card>
        </Section>
      )}

      <Section title="Actions rapides">
        <QuickActionsGrid />
      </Section>

      <Section title="EQUIFLOW AI">
        <Card className="card--brand stack">
          <div className="row">
            <Icon name="sparkle" />
            <strong>Posez une question sur votre cheval</strong>
          </div>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              if (question.trim()) sessionStorage.setItem('equiflow.pendingQuestion', question.trim());
              navigate('ai');
            }}
          >
            <input
              className="field__control"
              style={{ flex: 1, minWidth: 0 }}
              placeholder={horse ? `Combien ${horse.name} m’a coûté depuis janvier ?` : 'Posez votre question'}
              aria-label="Question pour l’assistant"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              enterKeyHint="send"
            />
            <IconButton icon="send" label="Demander" type="submit" style={{ background: 'var(--color-surface)', color: 'var(--color-brand-text)' }} />
          </form>
        </Card>
      </Section>
    </>
  );
}
