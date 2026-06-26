import { FormEvent, useState } from 'react';
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

const INITIAL: FieldState = { value: '', show: false, error: '' };

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const [current, setCurrent] = useState<FieldState>(INITIAL);
  const [next, setNext] = useState<FieldState>(INITIAL);
  const [confirm, setConfirm] = useState<FieldState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  function reset() {
    setCurrent(INITIAL);
    setNext(INITIAL);
    setConfirm(INITIAL);
    setSubmitting(false);
    setSuccess(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function validate(): boolean {
    let ok = true;

    if (!current.value) {
      setCurrent((s) => ({ ...s, error: 'Informe sua senha atual.' }));
      ok = false;
    } else {
      setCurrent((s) => ({ ...s, error: '' }));
    }

    if (next.value.length < 8) {
      setNext((s) => ({ ...s, error: 'Insira pelo menos 8 caracteres.' }));
      ok = false;
    } else {
      setNext((s) => ({ ...s, error: '' }));
    }

    if (confirm.value !== next.value) {
      setConfirm((s) => ({ ...s, error: 'As senhas não coincidem.' }));
      ok = false;
    } else {
      setConfirm((s) => ({ ...s, error: '' }));
    }

    return ok;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    // TODO: call API PATCH /auth/change-password { currentPassword, newPassword }
    await new Promise((r) => setTimeout(r, 900)); // simulate network
    setSubmitting(false);
    setSuccess(true);

    setTimeout(() => {
      handleClose();
    }, 1500);
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Mudar senha"
      size="md"
      description="Altere a senha de acesso ao painel. Use no mínimo 8 caracteres com letras e números."
      footer={
        success ? null : (
          <>
            <button className="chpw-btn-cancel" type="button" onClick={handleClose}
              disabled={submitting}>
              Cancelar
            </button>
            <button className="chpw-btn-confirm" type="submit" form="chpw-form"
              disabled={submitting}>
              {submitting ? (
                <><span className="chpw-spin" /> Salvando…</>
              ) : 'Confirmar'}
            </button>
          </>
        )
      }
    >
      {success ? (
        <div className="chpw-success">
          <div className="chpw-success__icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="chpw-success__msg">Senha alterada com sucesso!</p>
        </div>
      ) : (
        <form id="chpw-form" onSubmit={handleSubmit} noValidate>
          {/* Current password */}
          <div className="chpw-field">
            <div className={`chpw-input-wrap${current.error ? ' chpw-input-wrap--error' : ''}`}>
              <input
                className="chpw-input"
                type={current.show ? 'text' : 'password'}
                placeholder="Insira sua senha atual"
                value={current.value}
                onChange={(e) => setCurrent((s) => ({ ...s, value: e.target.value, error: '' }))}
                autoComplete="current-password"
              />
              <button type="button" className="chpw-eye"
                onClick={() => setCurrent((s) => ({ ...s, show: !s.show }))}
                aria-label={current.show ? 'Ocultar senha' : 'Mostrar senha'}>
                <EyeIcon visible={current.show} />
              </button>
            </div>
            {current.error && <FieldError message={current.error} />}
          </div>

          {/* New password */}
          <div className="chpw-field">
            <div className={`chpw-input-wrap${next.error ? ' chpw-input-wrap--error' : ''}`}>
              <input
                className="chpw-input"
                type={next.show ? 'text' : 'password'}
                placeholder="Insira a nova senha"
                value={next.value}
                onChange={(e) => setNext((s) => ({ ...s, value: e.target.value, error: '' }))}
                autoComplete="new-password"
              />
              <button type="button" className="chpw-eye"
                onClick={() => setNext((s) => ({ ...s, show: !s.show }))}
                aria-label={next.show ? 'Ocultar senha' : 'Mostrar senha'}>
                <EyeIcon visible={next.show} />
              </button>
            </div>
            {next.error
              ? <FieldError message={next.error} />
              : <p className="chpw-hint">Mínimo 8 caracteres com letras e números.</p>}
          </div>

          {/* Confirm new password */}
          <div className="chpw-field">
            <div className={`chpw-input-wrap${confirm.error ? ' chpw-input-wrap--error' : ''}`}>
              <input
                className="chpw-input"
                type={confirm.show ? 'text' : 'password'}
                placeholder="Insira a nova senha novamente"
                value={confirm.value}
                onChange={(e) => {
                  const val = e.target.value;
                  const mismatch = val.length > 0 && val !== next.value;
                  setConfirm((s) => ({ ...s, value: val, error: mismatch ? 'As senhas não coincidem.' : '' }));
                }}
                autoComplete="new-password"
              />
              <button type="button" className="chpw-eye"
                onClick={() => setConfirm((s) => ({ ...s, show: !s.show }))}
                aria-label={confirm.show ? 'Ocultar senha' : 'Mostrar senha'}>
                <EyeIcon visible={confirm.show} />
              </button>
            </div>
            {confirm.error && <FieldError message={confirm.error} />}
          </div>
        </form>
      )}
    </Modal>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <p className="chpw-error">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
      {message}
    </p>
  );
}
