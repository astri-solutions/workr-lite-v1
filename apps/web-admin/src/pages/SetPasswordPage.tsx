import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import './LoginPage.css';
import './SetPasswordPage.css';

type Step = 'loading' | 'password' | 'done' | 'error';

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('loading');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      // No Supabase — go straight to password step (dev mode)
      setStep('password');
      return;
    }

    // Supabase processes the #access_token hash automatically on init.
    // Wait for the auth state to settle.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
        if (session) setStep('password');
        else setStep('error');
      }
    });

    // Also check if session already exists (in case the event fired before we subscribed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setStep('password');
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPassError('');
    if (newPass.length < 8) { setPassError('A senha deve ter pelo menos 8 caracteres.'); return; }
    if (newPass !== confirmPass) { setPassError('As senhas não coincidem.'); return; }

    if (!isSupabaseConfigured || !supabase) {
      // Dev mode: just proceed
      setStep('done');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setSubmitting(false);

    if (error) {
      setPassError(error.message);
      return;
    }

    await supabase.auth.signOut();
    setStep('done');
  }

  const strength = newPass.length === 0 ? null : newPass.length < 8 ? 'fraca' : newPass.length < 12 ? 'média' : 'forte';
  const strengthColor = strength === 'forte' ? '#00D865' : strength === 'média' ? '#f59e0b' : '#ef4444';

  return (
    <div className="login-root">
      <div className="login-left">

        {step === 'loading' && (
          <div className="login-card">
            <div className="login-logo">
              <img src="/logos/logotipo-workr.png" alt="Astri" className="login-logo__img" />
            </div>
            <p className="sp-desc" style={{ textAlign: 'center', marginTop: '24px' }}>Validando convite…</p>
          </div>
        )}

        {step === 'error' && (
          <div className="login-card">
            <div className="login-logo">
              <img src="/logos/logotipo-workr.png" alt="Astri" className="login-logo__img" />
            </div>
            <h1 className="login-title">Link inválido</h1>
            <p className="sp-desc">Este link de convite é inválido ou já expirou. Solicite um novo convite ao administrador.</p>
            <p className="rec-desc" style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px' }}>{errorMsg}</p>
            <button className="login-btn" type="button" style={{ marginTop: '24px' }} onClick={() => navigate('/login')}>
              Ir para o login
            </button>
          </div>
        )}

        {step === 'password' && (
          <div className="login-card">
            <div className="login-logo">
              <img src="/logos/logotipo-workr.png" alt="Astri" className="login-logo__img" />
            </div>
            <h1 className="login-title">Crie sua senha</h1>
            <p className="sp-desc">Bem-vindo(a)! Defina uma senha segura para acessar o portal.</p>

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
                    className={`login-input${confirmPass.length > 0 && confirmPass !== newPass ? ' login-input--error' : ''}`}
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
                {confirmPass.length > 0 && confirmPass !== newPass && (
                  <p className="sp-inline-error">As senhas não coincidem.</p>
                )}
              </div>

              <button className="login-btn" type="submit" disabled={!newPass || !confirmPass || submitting}>
                {submitting ? 'Salvando…' : 'Criar senha'}
                {!submitting && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                )}
              </button>
            </form>
          </div>
        )}

        {step === 'done' && (
          <div className="login-card">
            <div className="login-logo">
              <img src="/logos/logotipo-workr.png" alt="Astri" className="login-logo__img" />
            </div>
            <div className="rec-done-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00D865" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10" />
                <polyline points="9 12 11 14 15 10" strokeWidth="2.2" />
              </svg>
            </div>
            <h1 className="login-title">Senha criada!</h1>
            <p className="sp-desc">Sua senha foi definida com sucesso. Faça login para acessar o portal.</p>
            <button className="login-btn" type="button" style={{ marginTop: '8px' }} onClick={() => navigate('/login')}>
              Ir para o login
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        )}

      </div>

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
            <span className="login-right__developed">Powered by:</span>
            <img src="/logos/astri/logotipo-astri.png" alt="Astri" className="login-right__logo-img" />
          </div>
        </footer>
      </div>
    </div>
  );
}
