import { useState } from 'react';
import Modal from './Modal';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
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
  const { user } = useAuth();
  const [current, setCurrent] = useState<FieldState>(makeField());
  const [next, setNext] = useState<FieldState>(makeField());
  const [confirm, setConfirm] = useState<FieldState>(makeField());
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState('');

  function handleClose() {
    setCurrent(makeField());
    setNext(makeField());
    setConfirm(makeField());
    setSubmitting(false);
    setDone(false);
    setFormError('');
    onClose();
  }

  async function handleSubmit() {
    if (submitting) return;
    setFormError('');

    let hasError = false;
    if (!current.value) { setCurrent(s => ({ ...s, error: 'Informe a senha atual.' })); hasError = true; }
    if (next.value.length < 8) { setNext(s => ({ ...s, error: 'Mínimo 8 caracteres.' })); hasError = true; }
    if (confirm.value !== next.value) { setConfirm(s => ({ ...s, error: 'As senhas não coincidem.' })); hasError = true; }
    if (hasError || !isSupabaseConfigured || !supabase || !user?.email) return;

    setSubmitting(true);
    try {
      // Supabase's updateUser() trusts whatever session is active — it never
      // asks for the current password on its own. Re-authenticating with it
      // first (signInWithPassword) is what actually verifies the user knows
      // it before we let them overwrite it; a wrong current password fails
      // here instead of silently being ignored.
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: current.value,
      });
      if (verifyError) {
        setCurrent(s => ({ ...s, error: 'Senha atual incorreta.' }));
        setSubmitting(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: next.value });
      if (updateError) {
        setFormError(updateError.message || 'Não foi possível atualizar a senha.');
        setSubmitting(false);
        return;
      }

      setDone(true);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Não foi possível atualizar a senha.');
      setSubmitting(false);
    }
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
        done ? (
          <button className="chpw-btn-confirm" type="button" onClick={handleClose}>Fechar</button>
        ) : (
          <>
            <button className="chpw-btn-cancel" type="button" onClick={handleClose} disabled={submitting}>Cancelar</button>
            <button className="chpw-btn-confirm" type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Confirmando…' : 'Confirmar'}
            </button>
          </>
        )
      }
    >
      {done ? (
        <p className="chpw-success">Senha atualizada com sucesso.</p>
      ) : (
        <>
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
            <p className="chpw-hint">Mínimo 8 caracteres.</p>
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
          {formError && <p className="chpw-error">{formError}</p>}
        </>
      )}
    </Modal>
  );
}
