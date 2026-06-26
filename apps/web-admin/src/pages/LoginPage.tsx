import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const success = login(email, password);
    if (!success) {
      setError('Usuário ou senha inválidos.');
      return;
    }
    const raw = localStorage.getItem('workr_auth');
    if (raw) {
      const user = JSON.parse(raw);
      if (user.role === 'super_admin') navigate('/admin/portais');
      else navigate('/portal');
    }
  }

  return (
    <div
      className="login-root"
      style={{
        backgroundImage: [
          'linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(11,91,104,0.82) 52%, rgba(5,50,60,0.93) 100%)',
          "url('/img/bg-image-workr-login.webp')",
        ].join(', '),
      }}
    >
      {/* ── Left: floating white card ── */}
      <div className="login-left">
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
              <input
                id="password"
                className="login-input"
                type="password"
                autoComplete="current-password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
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
            <a href="#" onClick={(e) => e.preventDefault()}>Clique aqui</a>
          </p>
        </div>
      </div>

      {/* ── Right: text overlay on the background ── */}
      <div className="login-right">
        <p className="login-right__tagline">Seu parceiro de RI</p>

        <div className="login-right__content">
          <h2 className="login-right__headline">
            A Gestão da<br />
            Comunicação em uma<br />
            única plataforma.
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
