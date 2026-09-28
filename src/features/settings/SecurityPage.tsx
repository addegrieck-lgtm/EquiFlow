import { useState } from 'react';
import { toHash } from '../../app/router';
import { useSetting } from '../../data/hooks';
import { Button, Card, LogoMark, PageHeader, TextField, toast, toastError } from '../../design/components';
import { checkPin, clearPin, isValidPin, markUnlocked, PIN_KEY, setPin } from '../../services/pin';

export function SecurityPage() {
  const hasPin = Boolean(useSetting<unknown>(PIN_KEY, undefined));
  const [current, setCurrent] = useState('');
  const [pin, setPinValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 6);

  const save = async () => {
    try {
      if (hasPin && !(await checkPin(current))) return toast('Code actuel incorrect', 'error');
      if (pin !== confirm) return toast('Les deux codes ne correspondent pas', 'error');
      await setPin(pin);
      setCurrent('');
      setPinValue('');
      setConfirm('');
      toast('Code enregistré');
    } catch (e) {
      toastError(e);
    }
  };

  const disable = async () => {
    if (!(await checkPin(current))) return toast('Code actuel incorrect', 'error');
    await clearPin();
    setCurrent('');
    toast('Code désactivé');
  };

  return (
    <>
      <PageHeader title="Code de verrouillage" backHref={toHash('more')} />
      <div className="form">
        <Card className="small muted">
          Le code est demandé à chaque ouverture de l’app. Il évite qu’une personne qui emprunte votre téléphone consulte votre dossier ; il ne chiffre pas les données. Si vous
          l’oubliez, il faudra supprimer les données du site dans Safari (pensez aux sauvegardes).
        </Card>
        {hasPin && <TextField label="Code actuel" type="password" inputMode="numeric" autoComplete="current-password" value={current} onChange={(e) => setCurrent(digits(e.target.value))} />}
        <TextField label={hasPin ? 'Nouveau code' : 'Code (4 à 6 chiffres)'} type="password" inputMode="numeric" autoComplete="new-password" value={pin} onChange={(e) => setPinValue(digits(e.target.value))} />
        <TextField label="Confirmer le code" type="password" inputMode="numeric" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(digits(e.target.value))} />
        <Button disabled={!isValidPin(pin) || !confirm || (hasPin && !current)} onClick={save}>
          {hasPin ? 'Changer le code' : 'Activer le code'}
        </Button>
        {hasPin && (
          <Button variant="ghost" disabled={!current} onClick={disable}>
            Désactiver le code
          </Button>
        )}
      </div>
    </>
  );
}

/** Écran de verrouillage à l'ouverture. */
export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string>();
  const submit = async (value: string) => {
    if (await checkPin(value)) {
      markUnlocked();
      onUnlock();
    } else {
      setError('Code incorrect');
      setPin('');
    }
  };
  return (
    <main className="app">
      <div className="lock">
        <LogoMark size={72} />
        <h1 className="page-header__title">EQUIFLOW est verrouillé</h1>
        <form
          className="stack"
          style={{ alignItems: 'center' }}
          onSubmit={(e) => {
            e.preventDefault();
            submit(pin);
          }}
        >
          <input
            className="field__control pin-input"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            aria-label="Code de verrouillage"
            autoFocus
            value={pin}
            onChange={(e) => {
              setError(undefined);
              setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
            }}
          />
          {error && (
            <span className="field__error" role="alert">
              {error}
            </span>
          )}
          <Button type="submit" disabled={pin.length < 4}>
            Déverrouiller
          </Button>
        </form>
      </div>
    </main>
  );
}
