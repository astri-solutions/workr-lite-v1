import Modal from './Modal';
import '../pages/portal/PersonalizarPages.css';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  desc?: string;
}

/** Same animated checkmark confirmation used by Banner's "Publicar" — reused
 * anywhere a CMS action should give the user a clear success moment instead
 * of just a silent badge/status change. */
export default function PublishSuccessModal({
  open, onClose,
  title = 'Publicado!',
  desc = 'As alterações já estão visíveis no portal.',
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title=""
      size="sm"
      footer={
        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn-primary" onClick={onClose}>
            Fechar
          </button>
        </div>
      }
    >
      <div className="banner-publish-success">
        <div className="banner-success-icon">
          <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle className="banner-success-circle" cx="28" cy="28" r="26" stroke="#00D865" strokeWidth="3" />
            <polyline className="banner-success-check" points="16,28 24,36 40,20" stroke="#00D865" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="banner-success-title">{title}</p>
        <p className="banner-success-desc">{desc}</p>
      </div>
    </Modal>
  );
}
