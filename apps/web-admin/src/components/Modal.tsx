import { ReactNode, useEffect } from 'react';
import './Modal.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  // 'side' docks the panel to the right edge, full height, and slides in
  // from the right instead of scaling in centered — same header/body/footer
  // structure and the same onClose/footer contract, purely a different shell.
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
  variant = 'center',
}: ModalProps) {
  // Lock body scroll and close on Escape
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={`modal-overlay${variant === 'side' ? ' modal-overlay--side' : ''}`} onMouseDown={onClose}>
      <div
        className={`modal modal--${size}${variant === 'side' ? ' modal--side' : ''}`}
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
