import { useState, useRef, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';
import './SetPasswordPage.css';

type Step = 'password' | 'send' | 'code' | 'done';

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('password');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  const email = 'cliente@empresa.com.br'; // would come from the invite link token

  useEffect(() => {
    if (step === 'code') setTimeout(() => codeRefs.current[0]?.focus(), 80);
  }, [step]);

  function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPassError('');
    if (newPass.length < 8) { setPassError('A senha deve ter pelo menos 8 caracteres.'); return; }
    if (newPass !== confirmPass) { setPassError('As senhas não coincidem.'); return; }
    setStep('send');
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
    setStep('done');
  }

  const strength = newPass.length === 0 ? null : newPass.length < 8 ? 'fraca' : newPass.length < 12 ? 'média' : 'forte';
  const strengthColor = strength === 'forte' ? '#00D865' : strength === 'média' ? '#f59e0b' : '#ef4444';

  return (
    <div className="login-root">
      {/* ── Left: card ── */}
      <div className="login-left">

        {/* Step 1: Define senha */}
        {step === 'password' && (
          <div className="login-card">
            <div className="login-logo">
              <img src="/logos/logotipo-original.svg" alt="Astri" className="login-logo__img" />
            </div>
            <h1 className="login-title">Crie sua senha</h1>
            <p className="sp-desc">Bem-vindo(a)! Defina uma senha segura para acessar o portal.</p>

            {passError && <p className="login-error">{passError}</p>}

            <form className="login-form" onSubmit={handlePasswordSubmit} noValidate>
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
                {newPass.length > 0 && (
                  <div className="rec-strength">
                    <div className="rec-strength__bars">
                      {[1, 2, 3, 4].map(n => (
                        <div key={n} className={`rec-strength__bar${newPass.length >= n * 3 ? ' rec-strength__bar--on' : ''}`}
                          style={{ background: newPass.length >= n * 3 ? strengthColor : undefined }} />
                      ))}
                    </div>
                    <span className="rec-strength__label">{strength === 'forte' ? 'Forte' : strength === 'média' ? 'Média' : 'Fraca'}</span>
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
                    {showConfirm
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    }
                  </button>
                </div>
              </div>

              <button className="login-btn" type="submit" disabled={!newPass || !confirmPass}>
                Próximo
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Confirmar envio do código */}
        {step === 'send' && (
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
            <h1 className="login-title">Verificar e-mail</h1>
            <p className="rec-desc">Enviaremos um código de verificação para confirmar seu acesso:</p>
            <p className="rec-email-highlight">{email}</p>
            <div className="rec-sent-actions">
              <button className="rec-btn-secondary" type="button" onClick={() => setStep('password')}>
                Voltar
              </button>
              <button className="login-btn" type="button" onClick={() => setStep('code')}>
                Enviar código
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Inserir código */}
        {step === 'code' && (
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
                Confirmar
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </form>
            <p className="rec-resend">
              Não recebeu?{' '}
              <button type="button" className="rec-resend-btn" onClick={() => setCode(['', '', '', '', '', ''])}>
                Reenviar código
              </button>
            </p>
          </div>
        )}

        {/* Step 4: Sucesso */}
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
            <p className="rec-desc">Sua senha foi definida com sucesso. Agora você pode fazer login no portal.</p>
            <button className="login-btn" type="button" onClick={() => navigate('/login')}>
              Ir para o login
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        )}

      </div>

      {/* ── Right: bg ── */}
      <div className="login-right">
        <p className="login-right__tagline">Seu parceiro de RI</p>
        <div className="login-right__content">
          <h2 className="login-right__headline">
            <span className="login-right__headline--white">Bem-vindo(a) à </span>
            <span className="login-right__headline--green">plataforma Astri.</span>
          </h2>
          <p className="login-right__subtitle">
            Configure sua senha e comece a gerenciar seu portal de Relações com Investidores.
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
