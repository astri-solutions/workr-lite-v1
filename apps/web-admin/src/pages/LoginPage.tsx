import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import './LoginPage.css';

/* ─── Recovery flow ───────────────────────────────── */
type RecoveryStep = 'email' | 'sent';

function RecoveryFlow({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<RecoveryStep>('email');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setSending(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/definir-senha`,
        });
        if (err) { setError(err.message); return; }
      }
      setStep('sent');
    } finally {
      setSending(false);
    }
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
        <img src="/logos/logotipo-workr.png" alt="Astri" className="login-logo__img" />
      </div>
      <h1 className="login-title">Recuperar senha</h1>
      <p className="rec-desc">Informe o e-mail cadastrado. Enviaremos um link para redefinir sua senha.</p>
      {error && <p className="login-error">{error}</p>}
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
        <button className="login-btn" type="submit" disabled={!email.trim() || sending}>
          {sending ? 'Enviando…' : 'Enviar link'}
          {!sending && (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );

  /* ── Step: sent ── */
  return (
    <div className="login-card">
      <div className="login-logo">
        <img src="/logos/logotipo-workr.png" alt="Astri" className="login-logo__img" />
      </div>
      <div className="rec-sent-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0B5B68" strokeWidth="1.8">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22 6 12 13 2 6" />
        </svg>
      </div>
      <h1 className="login-title">Verifique seu e-mail</h1>
      <p className="rec-desc">
        Se o endereço <strong>{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha.
      </p>
      <p className="rec-desc rec-desc--sm">Verifique também a caixa de spam. O link expira em 1 hora.</p>
      <button className="login-btn" type="button" style={{ marginTop: '8px' }} onClick={onBack}>
        Voltar ao login
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
              <img src="/logos/logotipo-workr.png" alt="Astri" className="login-logo__img" />
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
            Gestão simples. Resultados reais.
          </p>
        </div>

        <footer className="login-right__footer">
          <span className="login-right__footer-label">astri.solutions</span>
          <div className="login-right__footer-right">
            <span className="login-right__developed">Powered by:</span>
            <img
              src="/logos/astri/logotipo-negative.svg"
              alt="Astri"
              className="login-right__logo-img"
            />
          </div>
        </footer>
      </div>
    </div>
  );
}
