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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
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
