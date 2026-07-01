import { useState } from 'react';
import './BackupPage.css';
import StickyPageHeader from '../../components/StickyPageHeader';

type Tab = 'gerenciar' | 'restaurar' | 'historico';

interface BackupEntry {
  id: string;
  date: string;
  size: string;
  type: 'auto' | 'manual';
}

const BACKUPS: BackupEntry[] = [
  { id: 'b1', date: '2026-06-30 22:27', size: '142 MB', type: 'auto' },
  { id: 'b2', date: '2026-06-23 22:14', size: '139 MB', type: 'auto' },
  { id: 'b3', date: '2026-06-16 22:31', size: '137 MB', type: 'auto' },
  { id: 'b4', date: '2026-06-09 22:08', size: '135 MB', type: 'auto' },
];

export default function BackupPage() {
  const [tab, setTab] = useState<Tab>('gerenciar');
  const [alertDismissed, setAlertDismissed] = useState(false);

  return (
    <div className="page bk-page">
      <StickyPageHeader
        title="Backups"
        description={undefined}
        action={undefined}
      />

      {/* Tabs */}
      <div className="bk-tabs">
        <button className={`bk-tab${tab === 'gerenciar' ? ' bk-tab--active' : ''}`} onClick={() => setTab('gerenciar')}>Gerenciar backups</button>
        <button className={`bk-tab${tab === 'restaurar' ? ' bk-tab--active' : ''}`} onClick={() => setTab('restaurar')}>Restaurar e baixar</button>
        <button className={`bk-tab${tab === 'historico' ? ' bk-tab--active' : ''}`} onClick={() => setTab('historico')}>Restaurar histórico</button>
      </div>

      {/* ── Gerenciar backups ── */}
      {tab === 'gerenciar' && (
        <div className="bk-content">

          {!alertDismissed && (
            <div className="bk-alert">
              <svg className="bk-alert__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div className="bk-alert__body">
                <strong>Alguns arquivos não estão incluídos nos seus backups</strong>
                <p>Arquivos de plugins de backup, cache e arquivos de exportação de banco de dados são excluídos para manter os backups leves.</p>
              </div>
              <span className="bk-alert__date">A partir de: <strong>2026-06-25</strong></span>
              <button className="bk-alert__close" type="button" onClick={() => setAlertDismissed(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          {/* Backups de sites */}
          <div className="bk-card bk-card--main">
            <div className="bk-card__icon bk-card__icon--teal">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </div>
            <div className="bk-card__body">
              <h3 className="bk-card__title">Backups de sites</h3>
              <p className="bk-card__desc">Os backups são cópias de segurança do seu site que permitem restaurá-lo em caso de necessidade.</p>
            </div>
            <div className="bk-card__meta">
              <span className="bk-card__meta-label">Último backup:</span>
              <strong className="bk-card__meta-value">2026-06-30 22:27</strong>
            </div>
            <button className="bk-btn-primary" type="button" onClick={() => setTab('restaurar')}>Ver backups</button>
          </div>

          {/* 3-col grid */}
          <div className="bk-grid">

            {/* Backups manuais */}
            <div className="bk-card bk-card--col">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <div className="bk-card__title-row">
                <h3 className="bk-card__title">Backups manuais</h3>
                <span className="bk-badge bk-badge--locked">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Bloqueado
                </span>
              </div>
              <p className="bk-card__desc">Backups manuais podem ser criados uma vez a cada 24 horas e são ideais antes de atualizações, novos recursos ou grandes mudanças.</p>
              <div className="bk-card__footer">
                <button className="bk-btn-outline" type="button">Fazer Upgrade</button>
              </div>
            </div>

            {/* Backups automáticos */}
            <div className="bk-card bk-card--col">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><polyline points="3 3 3 8 8 8" />
              </svg>
              <div className="bk-card__title-row">
                <h3 className="bk-card__title">Backups automáticos</h3>
                <span className="bk-badge bk-badge--info">Semanal</span>
              </div>
              <p className="bk-card__desc">Backups semanais garantem a proteção de sites com menor frequência de atualizações.</p>
              <div className="bk-card__footer">
                <span className="bk-card__next">Próximo backup: <strong>2026-07-07</strong></span>
              </div>
            </div>

            {/* Upsell */}
            <div className="bk-card bk-card--col bk-card--upsell">
              <h3 className="bk-upsell__title">Precisa de backups diários?</h3>
              <p className="bk-upsell__desc">
                Faça backups diários também se você atualiza seu site com frequência e precisa de uma camada extra de segurança.{' '}
                <strong>Faça upgrade do seu plano</strong> para habilitar os backups diários.
              </p>
              <div className="bk-upsell__footer">
                <span className="bk-upsell__price">De <strong>R$11,99/mês</strong></span>
                <button className="bk-btn-primary" type="button">Comprar backups diários</button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Restaurar e baixar ── */}
      {tab === 'restaurar' && (
        <div className="bk-content">
          <div className="bk-list-header">
            <span>Data</span>
            <span>Tamanho</span>
            <span>Tipo</span>
            <span />
          </div>
          {BACKUPS.map(b => (
            <div key={b.id} className="bk-list-row">
              <span className="bk-list-row__date">{b.date}</span>
              <span className="bk-list-row__size">{b.size}</span>
              <span className={`bk-badge ${b.type === 'auto' ? 'bk-badge--info' : 'bk-badge--manual'}`}>
                {b.type === 'auto' ? 'Automático' : 'Manual'}
              </span>
              <div className="bk-list-row__actions">
                <button className="bk-btn-outline bk-btn-outline--sm" type="button">Restaurar</button>
                <button className="bk-btn-ghost" type="button">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Baixar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Restaurar histórico ── */}
      {tab === 'historico' && (
        <div className="bk-content bk-content--empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><polyline points="3 3 3 8 8 8" />
          </svg>
          <p>Nenhum histórico de restaurações disponível.</p>
        </div>
      )}
    </div>
  );
}
