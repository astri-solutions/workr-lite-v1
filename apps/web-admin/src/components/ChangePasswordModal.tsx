import { useState } from 'react';
import Modal from './Modal';
import './ChangePasswordModal.css';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

interface FieldState {
  value: string;
  show: boolean;
  error: string;
}

function makeField(): FieldState {
  return { value: '', show: false, error: '' };
}

export default function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const [current, setCurrent] = useState<FieldState>(makeField());
  const [next, setNext] = useState<FieldState>(makeField());
  const [confirm, setConfirm] = useState<FieldState>(makeField());

  function handleClose() {
    setCurrent(makeField());
    setNext(makeField());
    setConfirm(makeField());
    onClose();
  }

  function handleSubmit() {
    // TODO: call API PATCH /auth/change-password { currentPassword, newPassword }
    handleClose();
  }

  function PasswordField({
    id,
    label,
    state,
    setState,
    onChange,
    placeholder,
  }: {
    id: string;
    label: string;
    state: FieldState;
    setState: React.Dispatch<React.SetStateAction<FieldState>>;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
  }) {
    return (
      <div className="chpw-field">
        <label className="chpw-label" htmlFor={id}>{label}</label>
        <div className={`chpw-input-wrap${state.error ? ' chpw-input-wrap--error' : ''}`}>
          <input
            id={id}
            className="chpw-input"
            type={state.show ? 'text' : 'password'}
            placeholder={placeholder || label}
            value={state.value}
            onChange={onChange || ((e) => setState((s) => ({ ...s, value: e.target.value })))}
          />
          <button
            className="chpw-eye"
            type="button"
            aria-label={state.show ? 'Ocultar senha' : 'Mostrar senha'}
            onClick={() => setState((s) => ({ ...s, show: !s.show }))}
          >
            {state.show ? (
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility_off</span>
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility</span>
            )}
          </button>
        </div>
        {state.error && <p className="chpw-error">{state.error}</p>}
      </div>
    );
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Mudar senha"
      size="md"
      footer={
        <>
          <button className="chpw-btn-cancel" type="button" onClick={handleClose}>Cancelar</button>
          <button className="chpw-btn-confirm" type="button" onClick={handleSubmit}>Confirmar</button>
        </>
      }
    >
      <PasswordField
        id="chpw-current"
        label="Senha atual"
        state={current}
        setState={setCurrent}
        placeholder="Insira a senha atual"
      />
      <PasswordField
        id="chpw-next"
        label="Nova senha"
        state={next}
        setState={setNext}
        placeholder="Insira a nova senha"
      />
      {!next.error && (
        <p className="chpw-hint">Mínimo 8 caracteres com letras e números.</p>
      )}
      <PasswordField
        id="chpw-confirm"
        label="Insira a senha novamente"
        state={confirm}
        setState={setConfirm}
        placeholder="Confirme a nova senha"
        onChange={(e) => {
          const val = e.target.value;
          const mismatch = val.length > 0 && val !== next.value;
          setConfirm((s) => ({ ...s, value: val, error: mismatch ? 'As senhas não coincidem.' : '' }));
        }}
      />
    </Modal>
  );
}
