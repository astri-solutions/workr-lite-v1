import Modal from './Modal';

interface Props {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
}

export default function UnsavedModal({ open, onStay, onLeave }: Props) {
  if (!open) return null;
  return (
    <Modal
      open
      onClose={onStay}
      title="Alterações não salvas"
      size="sm"
      footer={
        <div className="modal-footer">
          <button className="btn-action btn-action--secondary" type="button" onClick={onStay}>
            Continuar editando
          </button>
          <button className="btn-action btn-action--danger" type="button" onClick={onLeave}>
            Sair sem salvar
          </button>
        </div>
      }
    >
      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)' }}>
        Você tem alterações que não foram salvas. Se sair agora, as alterações serão perdidas.
      </p>
    </Modal>
  );
}
