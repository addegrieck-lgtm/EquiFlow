import { useState } from 'react';
import { db } from '../../data/db';
import { setActiveHorse } from '../../data/hooks';
import { create } from '../../data/repo';
import { GOAL_LABELS, ROLE_LABELS } from '../../domain/labels';
import { GOALS, ROLES, type Goal, type Role } from '../../domain/models';
import { Button, Card, Chip, Icon, LogoMark, TextField, toastError, type IconName } from '../../design/components';
import { isValidPin, setPin } from '../../services/pin';
import { draftToHorse, emptyHorse, fieldErrors, HorseFields, type HorseDraft } from '../horse/HorseForm';

const ROLE_ICONS: Record<Role, IconName> = { rider: 'activity', owner: 'horseshoe', coach: 'user', pro: 'pro', stable: 'home' };
const STEPS = 6;

/** Premier lancement : court et agréable (SPEC §6), tout est facultatif sauf le prénom et le nom du cheval. */
export function Onboarding() {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [role, setRole] = useState<Role>('owner');
  const [horse, setHorse] = useState<HorseDraft>(emptyHorse());
  const [horseErrors, setHorseErrors] = useState<Record<string, string>>({});
  const [goals, setGoals] = useState<Goal[]>([]);
  const [pin, setPinValue] = useState('');
  const [saving, setSaving] = useState(false);

  const next = () => setStep((s) => Math.min(STEPS, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const finish = async (withPin: boolean) => {
    setSaving(true);
    try {
      await db.transaction('rw', [db.profiles, db.horses, db.settings], async () => {
        if (horse.name.trim()) {
          const h = await create('horses', draftToHorse(horse));
          await setActiveHorse(h.id);
        }
        await create('profiles', { firstName, role, goals, onboardedAt: new Date().toISOString() });
      });
      if (withPin) await setPin(pin);
    } catch (e) {
      const fe = fieldErrors(e);
      if (fe) {
        setHorseErrors(fe);
        setStep(3);
      } else toastError(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="onboarding">
      {step > 1 && (
        <div className="stack" style={{ gap: 'var(--space-3)' }}>
          <div className="onboarding__steps" aria-label={`Étape ${step} sur ${STEPS}`}>
            {Array.from({ length: STEPS }, (_, i) => (
              <span key={i} className={i < step ? 'on' : undefined} />
            ))}
          </div>
          <button type="button" className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={back}>
            ← Retour
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="stack" style={{ alignItems: 'center', textAlign: 'center', gap: 'var(--space-5)', paddingTop: 'var(--space-12)' }}>
          <LogoMark size={88} />
          <h1 className="display">Bienvenue dans EQUIFLOW</h1>
          <p className="muted" style={{ maxWidth: '32ch' }}>
            Le dossier complet de votre cheval : soins, séances, dépenses, documents et rappels. Vos données restent sur votre téléphone.
          </p>
          <Button size="lg" block onClick={next}>
            Commencer
          </Button>
        </div>
      )}

      {step === 2 && (
        <>
          <h1 className="page-header__title">Que souhaitez-vous faire ?</h1>
          <TextField label="Votre prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" placeholder="Adrien" />
          <div className="choice-list" role="group" aria-label="Votre profil">
            {ROLES.map((r) => (
              <button key={r} type="button" className="choice" aria-pressed={role === r} onClick={() => setRole(r)}>
                <Icon name={ROLE_ICONS[r]} />
                <span style={{ flex: 1 }}>{ROLE_LABELS[r]}</span>
                {role === r && <Icon name="check" size={20} />}
              </button>
            ))}
          </div>
          {(role === 'coach' || role === 'pro' || role === 'stable') && (
            <p className="small muted">Les espaces coach, professionnel et écurie arrivent en V2. En attendant, vous profitez de toutes les fonctions de suivi.</p>
          )}
          <Button size="lg" block disabled={!firstName.trim()} onClick={next}>
            Continuer
          </Button>
        </>
      )}

      {step === 3 && (
        <>
          <h1 className="page-header__title">Ajoutez votre cheval</h1>
          <HorseFields value={horse} onChange={setHorse} errors={horseErrors} compact />
          <Button size="lg" block disabled={!horse.name.trim()} onClick={next}>
            Continuer
          </Button>
          <button type="button" className="link-btn" onClick={() => { setHorse(emptyHorse()); next(); }}>
            Je n’ai pas de cheval pour l’instant
          </button>
        </>
      )}

      {step === 4 && (
        <>
          <h1 className="page-header__title">Vos objectifs</h1>
          <p className="muted">Ils orientent les suggestions de séances de l’assistant.</p>
          <div className="chips">
            {GOALS.map((g) => (
              <Chip key={g} selected={goals.includes(g)} onToggle={() => setGoals((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]))}>
                {GOAL_LABELS[g]}
              </Chip>
            ))}
          </div>
          <Button size="lg" block onClick={next}>
            Continuer
          </Button>
        </>
      )}

      {step === 5 && (
        <>
          <h1 className="page-header__title">Rappels</h1>
          <Card className="stack">
            <div className="row">
              <Icon name="bell" />
              <strong>Ne plus rien oublier</strong>
            </div>
            <p className="small muted">
              EQUIFLOW calcule les prochains vaccins, vermifuges, passages du maréchal et du dentiste. Ils s’affichent sur l’accueil dès qu’ils approchent.
            </p>
            <p className="small muted">
              Pour être prévenu même application fermée, ajoutez vos échéances au <strong>Calendrier de l’iPhone</strong> depuis l’Agenda : c’est lui qui vous enverra
              l’alerte. Les notifications directes arriveront avec la synchronisation (V1.5).
            </p>
          </Card>
          <Button size="lg" block onClick={next}>
            Compris
          </Button>
        </>
      )}

      {step === 6 && (
        <>
          <h1 className="page-header__title">Votre compte</h1>
          <Card className="stack">
            <div className="row">
              <Icon name="shield" />
              <strong>Privé par conception</strong>
            </div>
            <p className="small muted">
              Pas de mot de passe ni de serveur : votre compte vit sur ce téléphone. Pensez à exporter une sauvegarde de temps en temps (Plus → Sauvegarde).
            </p>
          </Card>
          <TextField
            label="Code de verrouillage (facultatif)"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            value={pin}
            onChange={(e) => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
            hint="4 à 6 chiffres, demandés à l’ouverture de l’app."
          />
          <Button size="lg" block disabled={saving || (pin.length > 0 && !isValidPin(pin))} onClick={() => finish(pin.length > 0)}>
            {saving ? 'Création…' : 'Créer mon espace'}
          </Button>
        </>
      )}
    </div>
  );
}
