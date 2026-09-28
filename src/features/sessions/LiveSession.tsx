import { useEffect, useState } from 'react';
import { toHash } from '../../app/router';
import { useActiveHorse } from '../../data/hooks';
import { Button, Card, PageHeader } from '../../design/components';
import { finishLive, formatClock, liveElapsed, liveTotals, loadLive, pauseLive, saveLive, startLive, switchGait, type LiveGait, type LiveState } from '../../services/liveSession';
import { HorseSelect } from '../shared';
import { liveResultHash } from './SessionForm';

const GAITS: { gait: LiveGait; label: string }[] = [
  { gait: 'walk', label: 'Pas' },
  { gait: 'trot', label: 'Trot' },
  { gait: 'canter', label: 'Galop' },
];

/** Maintient l'écran allumé pendant la séance quand le navigateur le permet. */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | undefined;
    const acquire = () => navigator.wakeLock.request('screen').then((l) => (lock = l)).catch(() => undefined);
    acquire();
    const onVisible = () => document.visibilityState === 'visible' && acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => undefined);
    };
  }, [active]);
}

export function LiveSessionPage() {
  const { horse, horses } = useActiveHorse();
  const [state, setState] = useState<LiveState | undefined>(loadLive);
  const [horseId, setHorseId] = useState<string | undefined>();
  const [now, setNow] = useState(Date.now());
  useWakeLock(Boolean(state?.current));

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const update = (s: LiveState | undefined) => {
    setState(s);
    saveLive(s);
  };

  if (!state) {
    return (
      <>
        <PageHeader title="Séance en direct" backHref={toHash('sessions')} />
        <div className="stack">
          {horses.length > 1 && <HorseSelect horses={horses} value={horseId ?? horse?.id} onChange={setHorseId} />}
          <Card className="small muted">
            Posez le téléphone dans votre poche ou sur le bord de la carrière. Touchez l’allure en cours à chaque changement : EQUIFLOW calcule le temps au pas, au trot et au
            galop. Le chronomètre continue même écran verrouillé.
          </Card>
          <Button size="lg" block icon="play" onClick={() => update(startLive(Date.now(), horseId ?? horse?.id))}>
            Démarrer au pas
          </Button>
        </div>
      </>
    );
  }

  const totals = liveTotals(state, now);
  const elapsed = liveElapsed(state, now);
  const finish = () => {
    const res = finishLive(state, Date.now());
    update(undefined);
    window.location.hash = liveResultHash(state.horseId, res);
  };

  return (
    <>
      <PageHeader title="Séance en direct" eyebrow={horses.find((h) => h.id === state.horseId)?.name} backHref={toHash('sessions')} />
      <Card className="timer">
        <span className="small muted">{state.current ? 'En cours' : 'En pause'}</span>
        <span className="timer__time" aria-live="off">
          {formatClock(elapsed)}
        </span>
      </Card>
      <div className="gait-grid" style={{ margin: 'var(--space-5) 0' }}>
        {GAITS.map((g) => (
          <button key={g.gait} type="button" className="gait-btn" aria-pressed={state.current === g.gait} onClick={() => update(switchGait(state, g.gait, Date.now()))}>
            {g.label}
            <span>{formatClock(totals[g.gait] + (g.gait === 'walk' ? totals.halt : 0))}</span>
          </button>
        ))}
      </div>
      <div className="stack">
        {state.current ? (
          <Button variant="secondary" icon="pause" block onClick={() => update(pauseLive(state, Date.now()))}>
            Pause
          </Button>
        ) : (
          <Button variant="secondary" icon="play" block onClick={() => update(switchGait(state, 'walk', Date.now()))}>
            Reprendre au pas
          </Button>
        )}
        <Button size="lg" icon="stop" block onClick={finish}>
          Terminer et enregistrer
        </Button>
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            if (window.confirm('Abandonner cette séance sans l’enregistrer ?')) update(undefined);
          }}
        >
          Abandonner
        </button>
      </div>
    </>
  );
}
