import { ReactNode, useEffect, useState } from 'react';
import './Modal.css';

const EXIT_DURATION_MS = 220;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  // 'side' (default) docks the panel to the right edge, full height, and
  // slides in from the right; 'center' scales in centered instead — same
  // header/body/footer structure and the same onClose/footer contract either
  // way, purely a different shell.
  variant?: 'center' | 'side';
  // Visually hides this modal via `visibility` (never opacity/display, and
  // never by touching `open`/mounted state) — a modal that nests another
  // one in its `children` (e.g. the "novo trimestre" wizard nesting its own
  // document drawer) used to toggle `open` to hide itself while the nested
  // one was up, but this component unmounts its whole subtree (children
  // included) EXIT_DURATION_MS after `open` goes false — 220ms, far less
  // than it takes to fill out a form — destroying the nested modal (and its
  // state) out from under the user mid-edit. `visibility: hidden` keeps
  // this modal (and everything inside it, including a nested modal) fully
  // mounted, and — unlike opacity/display — a descendant CAN override an
  // ancestor's `visibility: hidden` with its own `visibility: visible`,
  // which is exactly what every Modal's own overlay does below, so a
  // nested modal still renders normally even though its hidden parent
  // wraps it.
  hidden?: boolean;
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  variant = 'side',
  hidden = false,
}: ModalProps) {
  // Keeps the modal mounted for EXIT_DURATION_MS after `open` goes false, so
  // the slide/fade-out actually plays instead of the element just vanishing.
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const timer = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, EXIT_DURATION_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Lock body scroll and close on Escape — held for the whole mounted
  // lifetime (including the closing animation), not just while `open`.
  // Skipped entirely while `hidden`: a modal nesting another one in its
  // `children` (see below) stays mounted-but-hidden behind the nested one,
  // and its own Escape/body-lock must not fight with the nested modal's.
  useEffect(() => {
    if (!mounted || hidden) return;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [mounted, hidden, onClose]);

  if (!mounted) return null;

  return (
    <div
      className={`modal-overlay${variant === 'side' ? ' modal-overlay--side' : ''}${closing ? ' modal-overlay--closing' : ''}`}
      onMouseDown={hidden ? undefined : onClose}
      // `visibility: visible` / `pointerEvents: 'auto'` here are the
      // overrides that let a NESTED modal (rendered inside `children`, e.g.
      // the document drawer inside the wizard) stay visible AND clickable
      // even though this ancestor may itself be `visibility: hidden` /
      // `pointerEvents: 'none'` — see the `hidden` prop doc above. Leaving
      // either one as `undefined` instead of an explicit 'auto' does NOT
      // override the ancestor (both properties inherit), so the upload
      // dropzone and "Tipo de documento" select inside the nested drawer
      // were unclickable — inheriting `pointer-events: none` from the
      // hidden wizard modal wrapping them.
      style={{ visibility: hidden ? 'hidden' : 'visible', pointerEvents: hidden ? 'none' : 'auto' }}
      aria-hidden={hidden || undefined}
    >
      <div
        className={`modal modal--${size}${variant === 'side' ? ' modal--side' : ''}${closing ? ' modal--closing' : ''}`}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal__header">
          <div className="modal__header-top">
            <h2 className="modal__title" id="modal-title">{title}</h2>
            <button className="modal__close" type="button" onClick={onClose} aria-label="Fechar">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
            </button>
          </div>
          {description && <p className="modal__description">{description}</p>}
        </div>

        <div className="modal__body">{children}</div>

        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
