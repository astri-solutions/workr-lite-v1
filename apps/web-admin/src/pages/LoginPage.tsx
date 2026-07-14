import { useState, FormEvent, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

/* ─── Recovery flow steps ─────────────────────────── */
type RecoveryStep = 'email' | 'sent' | 'code' | 'newpass' | 'done';

function RecoveryFlow({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<RecoveryStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* Focus first code input when reaching that step */
  useEffect(() => {
    if (step === 'code') setTimeout(() => codeRefs.current[0]?.focus(), 80);
  }, [step]);

  function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStep('sent');
  }

  function handleConfirmSend() {
    setStep('code');
  }

  function handleCodeInput(val: string, idx: number) {
    if (!/^\d?$/.test(val)) return;
    const next = [...code];
    next[idx] = val;
    setCode(next);
    if (val && idx < 5) codeRefs.current[idx + 1]?.focus();
  }

  function handleCodeKeyDown(e: React.KeyboardEvent, idx: number) {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      codeRefs.current[idx - 1]?.focus();
    }
  }

  function handleCodePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      codeRefs.current[5]?.focus();
      e.preventDefault();
    }
  }

  function handleCodeSubmit(e: FormEvent) {
    e.preventDefault();
    if (code.join('').length < 6) return;
    setStep('newpass');
  }

  function handleNewPassSubmit(e: FormEvent) {
    e.preventDefault();
    setPassError('');
    if (newPass.length < 8) { setPassError('A senha deve ter pelo menos 8 caracteres.'); return; }
    if (newPass !== confirmPass) { setPassError('As senhas não coincidem.'); return; }
    setStep('done');
  }

  /* ── Step: email ── */
  if (step === 'email') return (
    <div className="login-card">
      <button className="rec-back" type="button" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Voltar
      </button>
      <div className="login-logo">
        <img src="/logos/logotipo-original.svg" alt="Astri" className="login-logo__img" />
      </div>
      <h1 className="login-title">Recuperar senha</h1>
      <p className="rec-desc">Informe o e-mail cadastrado na sua conta. Enviaremos um código de verificação.</p>
      <form className="login-form" onSubmit={handleEmailSubmit} noValidate>
        <div className="login-field">
          <label className="login-label" htmlFor="rec-email">E-mail</label>
          <input
            id="rec-email"
            className="login-input"
            type="email"
            placeholder="seu@email.com"
            autoFocus
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        <button className="login-btn" type="submit" disabled={!email.trim()}>
          Continuar
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </form>
    </div>
  );

  /* ── Step: sent confirmation ── */
  if (step === 'sent') return (
    <div className="login-card">
      <div className="login-logo">
        <img src="/logos/logotipo-original.svg" alt="Astri" className="login-logo__img" />
      </div>
      <div className="rec-sent-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0B5B68" strokeWidth="1.8">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22 6 12 13 2 6" />
        </svg>
      </div>
      <h1 className="login-title">Confirme o envio</h1>
      <p className="rec-desc">
        Enviaremos um código de 6 dígitos para:
      </p>
      <p className="rec-email-highlight">{email}</p>
      <p className="rec-desc rec-desc--sm">Verifique se o e-mail está correto antes de continuar.</p>
      <div className="rec-sent-actions">
        <button className="rec-btn-secondary" type="button" onClick={() => setStep('email')}>
          Corrigir e-mail
        </button>
        <button className="login-btn" type="button" onClick={handleConfirmSend}>
          Enviar código
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );

  /* ── Step: enter code ── */
  if (step === 'code') return (
    <div className="login-card">
      <div className="login-logo">
        <img src="/logos/logotipo-original.svg" alt="Astri" className="login-logo__img" />
      </div>
      <h1 className="login-title">Código de verificação</h1>
      <p className="rec-desc">
        Digite o código de 6 dígitos enviado para <strong>{email}</strong>.
      </p>
      <form className="login-form" onSubmit={handleCodeSubmit} noValidate>
        <div className="rec-code-wrap" onPaste={handleCodePaste}>
          {code.map((digit, i) => (
            <input
              key={i}
              ref={el => { codeRefs.current[i] = el; }}
              className="rec-code-input"
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleCodeInput(e.target.value, i)}
              onKeyDown={e => handleCodeKeyDown(e, i)}
            />
          ))}
        </div>
        <button className="login-btn" type="submit" disabled={code.join('').length < 6}>
          Verificar código
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </form>
      <p className="rec-resend">
        Não recebeu?{' '}
        <button type="button" className="rec-resend-btn" onClick={() => setCode(['','','','','',''])}>
          Reenviar código
        </button>
      </p>
    </div>
  );

  /* ── Step: new password ── */
  if (step === 'newpass') return (
    <div className="login-card">
      <div className="login-logo">
        <img src="/logos/logotipo-original.svg" alt="Astri" className="login-logo__img" />
      </div>
      <h1 className="login-title">Nova senha</h1>
      <p className="rec-desc">Escolha uma senha segura com pelo menos 8 caracteres.</p>
      {passError && <p className="login-error">{passError}</p>}
      <form className="login-form" onSubmit={handleNewPassSubmit} noValidate>
        <div className="login-field">
          <label className="login-label" htmlFor="new-pass">Nova senha</label>
          <div className="rec-pass-wrap">
            <input
              id="new-pass"
              className="login-input"
              type={showNew ? 'text' : 'password'}
              placeholder="Mínimo 8 caracteres"
              autoFocus
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
            />
            <button type="button" className="rec-pass-eye" onClick={() => setShowNew(v => !v)} tabIndex={-1}>
              {showNew
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              }
            </button>
          </div>
        </div>
        <div className="login-field">
          <label className="login-label" htmlFor="confirm-pass">Confirmar senha</label>
          <div className="rec-pass-wrap">
            <input
              id="confirm-pass"
              className="login-input"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Repita a senha"
              value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)}
            />
            <button type="button" className="rec-pass-eye" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
              {showConfirm
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              }
            </button>
          </div>
        </div>

        {/* Password strength indicator */}
        {newPass.length > 0 && (
          <div className="rec-strength">
            <div className="rec-strength__bars">
              {[1,2,3,4].map(n => (
                <div
                  key={n}
                  className={`rec-strength__bar${newPass.length >= n * 3 ? ' rec-strength__bar--on' : ''}`}
                  style={{ background: newPass.length >= 12 ? '#00D865' : newPass.length >= 6 ? '#f59e0b' : '#ef4444' }}
                />
              ))}
            </div>
            <span className="rec-strength__label">
              {newPass.length >= 12 ? 'Forte' : newPass.length >= 8 ? 'Média' : 'Fraca'}
            </span>
          </div>
        )}

        <button className="login-btn" type="submit" disabled={!newPass || !confirmPass}>
          Redefinir senha
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </form>
    </div>
  );

  /* ── Step: done ── */
  return (
    <div className="login-card">
      <div className="login-logo">
        <img src="/logos/logotipo-original.svg" alt="Astri" className="login-logo__img" />
      </div>
      <div className="rec-done-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00D865" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
          <polyline points="9 12 11 14 15 10" strokeWidth="2.2" />
        </svg>
      </div>
      <h1 className="login-title">Senha redefinida!</h1>
      <p className="rec-desc">Sua senha foi alterada com sucesso. Agora você pode fazer login com a nova senha.</p>
      <button className="login-btn" type="button" onClick={onBack}>
        Ir para o login
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

/* ─── Main Login ─────────────────────────────────── */
export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [recovery, setRecovery] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const success = await login(email, password);
    if (!success) {
      setError('Usuário ou senha inválidos.');
      return;
    }
    const raw = localStorage.getItem('workr_auth');
    if (raw) {
      const u = JSON.parse(raw);
      if (u.role === 'super_admin' && !u.portais?.length) {
        navigate('/admin/portais');
      } else if ((u.portais ?? []).length > 1) {
        navigate('/selecionar-portal');
      } else {
        navigate('/portal');
      }
    }
  }

  return (
    <div className="login-root">
      {/* ── Left: card ── */}
      <div className="login-left">
        {recovery ? (
          <RecoveryFlow onBack={() => setRecovery(false)} />
        ) : (
          <div className="login-card">
            <div className="login-logo">
              <img src="/logos/logotipo-original.svg" alt="Astri" className="login-logo__img" />
            </div>

            <h1 className="login-title">Acesse sua conta</h1>

            {error && <p className="login-error">{error}</p>}

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div className="login-field">
                <label className="login-label" htmlFor="email">
                  Usuário <span className="login-required">(*)</span>
                </label>
                <input
                  id="email"
                  className="login-input"
                  type="email"
                  autoComplete="email"
                  placeholder="Informe seu usuário"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="login-field">
                <label className="login-label" htmlFor="password">
                  Senha <span className="login-required">(*)</span>
                </label>
                <div className="rec-pass-wrap">
                  <input
                    id="password"
                    className="login-input"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button type="button" className="rec-pass-eye" onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                    {showPass
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    }
                  </button>
                </div>
              </div>

              <button className="login-btn" type="submit">
                Entrar
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </button>
            </form>

            <p className="login-forgot">
              Esqueceu sua senha?{' '}
              <button type="button" className="login-forgot-btn" onClick={() => setRecovery(true)}>
                Clique aqui
              </button>
            </p>
          </div>
        )}
      </div>

      {/* ── Right: bg ── */}
      <div className="login-right">
        <p className="login-right__tagline">Seu parceiro de RI</p>

        <div className="login-right__content">
          <h2 className="login-right__headline">
            <span className="login-right__headline--white">A Gestão da Comunicação em </span>
            <span className="login-right__headline--green">uma única plataforma.</span>
          </h2>
          <p className="login-right__subtitle">
            A Gestão da Comunicação em uma única plataforma.
          </p>
        </div>

        <footer className="login-right__footer">
          <span className="login-right__footer-label">astri.solutions</span>
          <div className="login-right__footer-right">
            <span className="login-right__developed">desenvolvido por:</span>
            <img
              src="/logos/logotipo-negative.svg"
              alt="Astri"
              className="login-right__logo-img"
            />
          </div>
        </footer>
      </div>
    </div>
  );
}
