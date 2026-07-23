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
  useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  return (
    <div
      className={`modal-overlay${variant === 'side' ? ' modal-overlay--side' : ''}${closing ? ' modal-overlay--closing' : ''}`}
      onMouseDown={onClose}
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
