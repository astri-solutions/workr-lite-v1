import { useState, FormEvent } from 'react';
import './LoginPage.css';
import './PrimeiroAcessoPage.css';

type Step = 'create' | 'done';

export default function PrimeiroAcessoPage() {
  const [step, setStep] = useState<Step>('create');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // In production this would come from the invite token in the URL
  const name = 'Carlos Mendes';
  const portalName = 'Construtora Aurora';

  const strength =
    newPass.length === 0 ? null
    : newPass.length < 8 ? 'fraca'
    : newPass.length < 12 ? 'média'
    : 'forte';
  const strengthColor =
    strength === 'forte' ? '#00D865'
    : strength === 'média' ? '#f59e0b'
    : '#ef4444';

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPassError('');
    if (newPass.length < 8) { setPassError('A senha deve ter pelo menos 8 caracteres.'); return; }
    if (newPass !== confirmPass) { setPassError('As senhas não coincidem.'); return; }
    setStep('done');
  }

  const EyeOpen = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
  const EyeOff = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

  return (
    <div className="login-root">
      {/* Left: card */}
      <div className="login-left">

        {step === 'create' && (
          <div className="login-card">
            <div className="login-logo">
              <img src="/logos/logotipo-original.svg" alt="Astri" className="login-logo__img" />
            </div>

            <div className="pa-welcome">
              <span className="pa-welcome__lock material-symbols-outlined">lock</span>
              <p className="pa-welcome__text">
                Olá, <strong>{name}</strong>! Você foi convidado(a) para acessar a área restrita de <strong>{portalName}</strong>.
              </p>
            </div>

            <h1 className="login-title">Crie sua senha</h1>

            {passError && <p className="login-error">{passError}</p>}

            <form className="login-form" onSubmit={handleSubmit} noValidate>
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
                    {showNew ? <EyeOff /> : <EyeOpen />}
                  </button>
                </div>
                {newPass.length > 0 && (
                  <div className="rec-strength">
                    <div className="rec-strength__bars">
                      {[1, 2, 3, 4].map(n => (
                        <div key={n}
                          className={`rec-strength__bar${newPass.length >= n * 3 ? ' rec-strength__bar--on' : ''}`}
                          style={{ background: newPass.length >= n * 3 ? strengthColor : undefined }}
                        />
                      ))}
                    </div>
                    <span className="rec-strength__label">
                      {strength === 'forte' ? 'Forte' : strength === 'média' ? 'Média' : 'Fraca'}
                    </span>
                  </div>
                )}
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
                    {showConfirm ? <EyeOff /> : <EyeOpen />}
                  </button>
                </div>
              </div>

              <button className="login-btn" type="submit" disabled={!newPass || !confirmPass}>
                Acessar área restrita
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </form>
          </div>
        )}

        {step === 'done' && (
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
            <h1 className="login-title">Senha criada!</h1>
            <p className="sp-desc">
              Seu acesso à área restrita de <strong>{portalName}</strong> está pronto.
            </p>
            <a className="login-btn pa-portal-btn" href="#">
              Ir para o portal
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
          </div>
        )}

      </div>

      {/* Right: background panel */}
      <div className="login-right">
        <p className="login-right__tagline">Seu parceiro de RI</p>
        <div className="login-right__content">
          <h2 className="login-right__headline">
            <span className="login-right__headline--white">Acesso exclusivo à </span>
            <span className="login-right__headline--green">área restrita.</span>
          </h2>
          <p className="login-right__subtitle">
            Conteúdo reservado para investidores e parceiros autorizados.
          </p>
        </div>
        <footer className="login-right__footer">
          <span className="login-right__footer-label">astri.solutions</span>
          <div className="login-right__footer-right">
            <span className="login-right__developed">desenvolvido por:</span>
            <img src="/logos/logotipo-negative.svg" alt="Astri" className="login-right__logo-img" />
          </div>
        </footer>
      </div>
    </div>
  );
}
