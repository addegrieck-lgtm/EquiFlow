import { useId, useRef, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: ReactNode };

export function TextArea({ label, hint, id, ...rest }: TextAreaProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className="field">
      <label className="field__label" htmlFor={fid}>
        {label}
      </label>
      <textarea id={fid} className="field__control field__control--area" rows={3} aria-describedby={hint ? `${fid}-msg` : undefined} {...rest} />
      {hint && (
        <span className="field__hint" id={`${fid}-msg`}>
          {hint}
        </span>
      )}
    </div>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  hideLabel?: boolean;
}

export function Segmented<T extends string>({ label, value, options, onChange, hideLabel }: SegmentedProps<T>) {
  return (
    <div className="field">
      {!hideLabel && <span className="field__label">{label}</span>}
      <div className="segmented" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Note de 1 à 5 (difficulté, ressenti). Un second appui sur la même note l'efface. */
export function RatingInput({ label, value, onChange, labels }: { label: string; value?: number; onChange: (v?: number) => void; labels?: readonly string[] }) {
  return (
    <div className="field">
      <span className="field__label">
        {label}
        {value && labels ? <span className="muted"> · {labels[value]}</span> : null}
      </span>
      <div className="rating" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={labels?.[n] ?? String(n)}
            className={value !== undefined && n <= value ? 'rating__dot rating__dot--on' : 'rating__dot'}
            onClick={() => onChange(value === n ? undefined : n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

interface FilePickerProps {
  label: string;
  icon?: IconName;
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  variant?: 'secondary' | 'primary';
}

/** Bouton qui ouvre l'appareil photo / la photothèque / les fichiers (choix proposé par iOS). */
export function FilePicker({ label, icon = 'camera', accept, multiple, onFiles, variant = 'secondary' }: FilePickerProps) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className={`btn btn--${variant} btn--md`} onClick={() => ref.current?.click()}>
        <Icon name={icon} size={20} />
        <span>{label}</span>
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = '';
          if (files.length) onFiles(files);
        }}
      />
    </>
  );
}
