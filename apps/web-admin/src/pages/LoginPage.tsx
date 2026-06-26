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
    // Redirect based on role stored in localStorage
    const raw = localStorage.getItem('workr_auth');
    if (raw) {
      const user = JSON.parse(raw);
      if (user.role === 'super_admin') navigate('/admin/portais');
      else navigate('/portal');
    }
  }

  return (
    <div className="login-root">
      {/* Left side — white card area */}
      <div className="login-left">
        <div className="login-card">
          <div className="login-logo">
            <img src="/logos/logotipo-original.svg" alt="Astri" className="login-logo__img" />
          </div>

          <h1 className="login-title">Acesse sua conta</h1>

          {error && <p className="login-error">{error}</p>}

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-field">
              <label className="login-label" htmlFor="email">Usuário <span className="login-required">(*)</span></label>
              <input
                id="email"
                className="login-input"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="password">Senha <span className="login-required">(*)</span></label>
              <input
                id="password"
                className="login-input"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button className="login-btn" type="submit">
              Entrar
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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

      {/* Right side — teal overlay */}
      <div className="login-right">
        <div className="login-right__content">
          <p className="login-right__tagline">Seu parceiro de RI</p>
          <h2 className="login-right__headline">
            A Gestão da<br />
            Comunicação em uma<br />
            única plataforma.
          </h2>
          <p className="login-right__subtitle">
            Centralize documentos, relatórios e comunicações com investidores em um só lugar.
          </p>
        </div>
        <div className="login-right__footer">
          <span className="login-right__domain">astri.solutions</span>
          <img src="/logos/logotipo-negative.svg" alt="Astri" className="login-right__logo-img" />
        </div>
      </div>
    </div>
  );
}
