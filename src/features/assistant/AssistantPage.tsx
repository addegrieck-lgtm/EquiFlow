import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { toHash } from '../../app/router';
import { db } from '../../data/db';
import { useAiContext } from '../../data/hooks';
import { create } from '../../data/repo';
import { Badge, Button, Chip, IconButton, PageHeader, toast, type BadgeTone } from '../../design/components';
import { addPlanToAgenda } from '../../services/actions';
import { answer, SUGGESTED_QUESTIONS } from '../../services/ai/engine';
import type { AiAnswer, SourceKind } from '../../services/ai/types';

const SOURCE: Record<SourceKind, { label: string; tone: BadgeTone }> = {
  data: { label: 'Donnée enregistrée', tone: 'success' },
  calc: { label: 'Calcul sur vos données', tone: 'brand' },
  suggestion: { label: 'Suggestion', tone: 'gold' },
  uncertain: { label: 'Incertain / manquant', tone: 'neutral' },
  warning: { label: 'Important', tone: 'danger' },
};

function AnswerView({ a }: { a: AiAnswer }) {
  const [added, setAdded] = useState(false);
  return (
    <div className="bubble bubble--ai">
      {a.blocks.map((b, i) => (
        <div key={i} className="ai-block">
          <Badge tone={SOURCE[b.kind].tone}>{SOURCE[b.kind].label}</Badge>
          <span>{b.text}</span>
          {b.items && (
            <ul>
              {b.items.map((it, j) => (
                <li key={j}>{it}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
      {a.actions.length > 0 && (
        <div className="row row--wrap">
          {a.actions.map((act, i) =>
            act.type === 'call' ? (
              <a key={i} className="btn btn--primary btn--md" href={`tel:${act.phone.replace(/[^\d+]/g, '')}`}>
                {act.label}
              </a>
            ) : act.type === 'link' ? (
              <a key={i} className="btn btn--secondary btn--md" href={act.href}>
                {act.label}
              </a>
            ) : (
              <Button
                key={i}
                icon="calendar"
                disabled={added}
                onClick={async () => {
                  const n = await addPlanToAgenda(act.horseId, act.items);
                  setAdded(true);
                  toast(`${n} séances ajoutées à l’agenda`);
                }}
              >
                {added ? 'Ajouté à l’agenda' : 'Ajouter à l’agenda'}
              </Button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

export function AssistantPage() {
  const ctx = useAiContext();
  const messages = useLiveQuery(() => db.aiMessages.orderBy('createdAt').toArray(), []) ?? [];
  const [question, setQuestion] = useState('');
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || !ctx) return;
    setQuestion('');
    const res = answer(text, ctx);
    await create('aiMessages', { role: 'user', text });
    await create('aiMessages', { role: 'assistant', text: res.blocks.map((b) => b.text).join('\n'), payload: res });
  };

  // Question saisie depuis l'accueil.
  useEffect(() => {
    if (!ctx) return;
    let pending: string | null = null;
    try {
      pending = sessionStorage.getItem('equiflow.pendingQuestion');
      sessionStorage.removeItem('equiflow.pendingQuestion');
    } catch {
      /* rien */
    }
    if (pending) ask(pending);
    // Volontairement une seule fois, dès que le contexte est prêt.
  }, [Boolean(ctx)]);

  return (
    <>
      <PageHeader
        title="EQUIFLOW AI"
        eyebrow="Assistant"
        backHref={toHash('home')}
        actions={messages.length ? <IconButton icon="trash" label="Effacer la conversation" onClick={() => db.aiMessages.clear()} /> : undefined}
      />
      <div className="chat">
        <div className="bubble bubble--ai">
          <span>
            Je réponds à partir des données de votre dossier, qui restent sur votre téléphone. J’indique toujours si une information est enregistrée, calculée, suggérée ou incertaine.
            Je ne pose jamais de diagnostic vétérinaire.
          </span>
        </div>
        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="bubble bubble--user">
              {m.text}
            </div>
          ) : (
            <AnswerView key={m.id} a={m.payload as AiAnswer} />
          ),
        )}
        <div ref={end} />
      </div>
      {messages.length === 0 && (
        <div className="chips" style={{ marginTop: 'var(--space-5)' }}>
          {SUGGESTED_QUESTIONS.map((q) => (
            <Chip key={q} onToggle={() => ask(q)}>
              {q}
            </Chip>
          ))}
        </div>
      )}
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <input className="field__control" placeholder="Posez une question sur votre cheval…" aria-label="Votre question" value={question} onChange={(e) => setQuestion(e.target.value)} enterKeyHint="send" />
        <IconButton icon="send" label="Envoyer" type="submit" disabled={!question.trim() || !ctx} style={{ background: 'var(--color-brand)', color: 'var(--color-on-brand)' }} />
      </form>
    </>
  );
}
