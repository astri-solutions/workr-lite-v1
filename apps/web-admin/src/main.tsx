import './styles/tokens.css';
import './styles/globals.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// TEMP DEBUG — remover depois de diagnosticar env vars na Cloudflare Pages.
console.log('[ENV DEBUG]', {
  url: import.meta.env.VITE_SUPABASE_URL,
  keyLength: (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').length,
  keyStart: (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').slice(0, 15),
  teste123: import.meta.env.VITE_TESTE_123,
});

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
