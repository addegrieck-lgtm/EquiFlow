import { useEffect, useRef, type ReactNode } from 'react';
import { IconButton } from './Button';

interface BottomSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Feuille modale ancrée en bas d'écran, construite sur <dialog> :
 * piège du focus, touche Échap et arrière-plan inerte fournis par le navigateur.
 */
export function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="sheet-title"
      onClose={onClose}
      onClick={(e) => {
        // clic sur l'arrière-plan (le <dialog> lui-même, hors du contenu)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet__body">
        <div className="sheet__handle" aria-hidden="true" />
        <header className="sheet__header">
          <h2 id="sheet-title" className="sheet__title">
            {title}
          </h2>
          <IconButton icon="close" label="Fermer" onClick={onClose} />
        </header>
        {children}
      </div>
    </dialog>
  );
}
