import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import type { AdminOutletContext } from '../../components/AdminLayout';
import { loadPortalSite } from '../../utils/loadPortalSite';
import './AdminPages.css';
import './AnalyticsPage.css';

type Period = '1h' | '6h' | '24h' | '7d';
type MainTab = 'paises' | 'ips' | 'solicitacoes' | 'dominios';
type PageTab = 'analytics' | 'logs' | 'erros5xx' | 'erros4xx';

interface PeriodData {
  bandwidth: string;
  requests: number;
  uniqueIps: number;
  chartRequests: number[];
  chartIps: number[];
  chartBandwidth: number[];
}

interface SiteAnalytics {
  paises: { name: string; value: number }[];
  ips: { name: string; value: number }[];
  solicitacoes: { name: string; value: number }[];
  dominios: { name: string; value: number }[];
  periods: Record<Period, PeriodData>;
}

const ANALYTICS_DB: Record<string, SiteAnalytics> = {
  s1: {
    paises: [
      { name: 'Brasil', value: 712 },
      { name: 'Estados Unidos', value: 64 },
      { name: 'Portugal', value: 28 },
      { name: 'Argentina', value: 19 },
      { name: 'Alemanha', value: 11 },
    ],
    ips: [
      { name: '189.28.150.12', value: 87 },
      { name: '200.195.134.44', value: 53 },
      { name: '177.92.47.10', value: 41 },
      { name: '201.17.62.88', value: 30 },
      { name: '191.205.18.3', value: 22 },
    ],
    solicitacoes: [
      { name: '/index.html', value: 310 },
      { name: '/assets/logo.svg', value: 187 },
      { name: '/api/relatorio', value: 94 },
      { name: '/styles/main.css', value: 77 },
      { name: '/favicon.ico', value: 46 },
    ],
    dominios: [
      { name: 'aurora.workr.com.br', value: 820 },
      { name: 'www.aurora.workr.com.br', value: 14 },
    ],
    periods: {
      '1h':  { bandwidth: '42.30 KB',  requests: 18,  uniqueIps: 7,  chartRequests: [2,3,1,4,2,3,1,2,0,1], chartIps: [1,2,1,3,1,2,1,1,0,1], chartBandwidth: [3,5,2,7,4,5,2,4,1,3] },
      '6h':  { bandwidth: '187.50 KB', requests: 91,  uniqueIps: 34, chartRequests: [8,12,10,15,14,10,9,8,12,13], chartIps: [4,6,5,7,6,5,4,4,5,6], chartBandwidth: [14,22,18,28,24,18,16,14,20,22] },
      '24h': { bandwidth: '857.94 KB', requests: 314, uniqueIps: 98, chartRequests: [22,30,28,35,40,32,28,22,30,27], chartIps: [8,12,10,14,16,12,10,8,12,10], chartBandwidth: [60,90,80,105,120,95,85,65,90,82] },
      '7d':  { bandwidth: '5.41 MB',   requests: 1840, uniqueIps: 412, chartRequests: [220,280,310,265,290,195,280], chartIps: [68,82,90,75,84,55,82], chartBandwidth: [680,840,950,820,890,640,840] },
    },
  },
  s2: {
    paises: [
      { name: 'Brasil', value: 1840 },
      { name: 'Estados Unidos', value: 210 },
      { name: 'Chile', value: 75 },
      { name: 'Reino Unido', value: 50 },
      { name: 'França', value: 32 },
    ],
    ips: [
      { name: '177.71.88.22', value: 205 },
      { name: '189.0.212.10', value: 150 },
      { name: '200.185.50.30', value: 98 },
      { name: '201.75.14.6', value: 77 },
      { name: '186.222.19.5', value: 55 },
    ],
    solicitacoes: [
      { name: '/index.html', value: 820 },
      { name: '/relatorios/2025', value: 445 },
      { name: '/assets/main.js', value: 310 },
      { name: '/api/press', value: 200 },
      { name: '/contato', value: 110 },
    ],
    dominios: [
      { name: 'imc.workr.com.br', value: 2100 },
      { name: 'www.imc.workr.com.br', value: 107 },
    ],
    periods: {
      '1h':  { bandwidth: '120.10 KB', requests: 55,  uniqueIps: 18, chartRequests: [4,7,5,9,6,8,5,4,6,7], chartIps: [2,3,2,4,3,3,2,2,3,3], chartBandwidth: [8,14,10,18,12,16,10,8,12,14] },
      '6h':  { bandwidth: '680.20 KB', requests: 310, uniqueIps: 88, chartRequests: [28,40,35,52,45,38,30,28,40,42], chartIps: [10,14,12,18,15,13,10,10,14,14], chartBandwidth: [54,80,68,105,88,75,58,54,78,82] },
      '24h': { bandwidth: '2.77 MB',   requests: 1120, uniqueIps: 280, chartRequests: [80,105,95,130,115,98,80,80,104,110], chartIps: [28,36,32,44,38,33,27,27,35,37], chartBandwidth: [180,240,215,300,265,225,185,185,240,254] },
      '7d':  { bandwidth: '17.20 MB',  requests: 7200, uniqueIps: 1540, chartRequests: [920,1050,980,1150,1040,820,1040], chartIps: [195,225,215,250,225,178,225], chartBandwidth: [2100,2440,2280,2680,2425,1910,2420] },
    },
  },
  s3: {
    paises: [
      { name: 'Estados Unidos', value: 540 },
      { name: 'Brasil', value: 310 },
      { name: 'Canadá', value: 88 },
      { name: 'Reino Unido', value: 65 },
      { name: 'Irlanda', value: 22 },
    ],
    ips: [
      { name: '104.28.18.21', value: 130 },
      { name: '162.158.92.5', value: 95 },
      { name: '172.68.42.18', value: 72 },
      { name: '189.28.17.40', value: 55 },
      { name: '200.10.5.12', value: 38 },
    ],
    solicitacoes: [
      { name: '/en/index.html', value: 410 },
      { name: '/en/reports/2025', value: 240 },
      { name: '/assets/main.js', value: 195 },
      { name: '/api/press', value: 120 },
      { name: '/en/contact', value: 82 },
    ],
    dominios: [
      { name: 'imc-en.workr.com.br', value: 980 },
      { name: 'www.imc-en.workr.com.br', value: 45 },
    ],
    periods: {
      '1h':  { bandwidth: '58.40 KB', requests: 28,  uniqueIps: 11, chartRequests: [2,4,3,5,3,4,2,3,4,3], chartIps: [1,2,1,2,1,2,1,1,2,1], chartBandwidth: [5,9,7,12,8,10,5,7,9,7] },
      '6h':  { bandwidth: '320.10 KB', requests: 145, uniqueIps: 52, chartRequests: [12,18,15,22,18,16,12,12,18,18], chartIps: [4,7,5,8,6,6,4,4,6,6], chartBandwidth: [24,36,30,44,36,32,24,24,36,36] },
      '24h': { bandwidth: '1.31 MB',  requests: 590, uniqueIps: 165, chartRequests: [42,55,50,68,60,52,42,42,55,56], chartIps: [14,18,16,22,20,17,14,14,18,18], chartBandwidth: [84,108,100,135,120,105,84,84,108,112] },
      '7d':  { bandwidth: '8.80 MB',  requests: 3850, uniqueIps: 820, chartRequests: [490,555,520,610,570,425,555], chartIps: [105,118,112,130,122,90,118], chartBandwidth: [1050,1200,1140,1340,1250,935,1220] },
    },
  },
  s4: {
    paises: [
      { name: 'Brasil', value: 285 },
      { name: 'Estados Unidos', value: 18 },
      { name: 'Portugal', value: 8 },
    ],
    ips: [
      { name: '200.141.90.14', value: 45 },
      { name: '189.50.22.7', value: 32 },
      { name: '186.220.14.10', value: 20 },
      { name: '201.5.18.44', value: 15 },
      { name: '177.20.10.8', value: 10 },
    ],
    solicitacoes: [
      { name: '/index.html', value: 155 },
      { name: '/assets/logo.svg', value: 88 },
      { name: '/styles/main.css', value: 55 },
      { name: '/ri/releases', value: 44 },
      { name: '/favicon.ico', value: 30 },
    ],
    dominios: [
      { name: 'vetra.workr.com.br', value: 310 },
    ],
    periods: {
      '1h':  { bandwidth: '14.20 KB', requests: 8,   uniqueIps: 3,  chartRequests: [0,1,1,2,1,1,0,1,0,1], chartIps: [0,1,0,1,1,0,0,1,0,1], chartBandwidth: [1,2,2,4,2,2,1,2,1,2] },
      '6h':  { bandwidth: '78.50 KB', requests: 42,  uniqueIps: 15, chartRequests: [3,6,5,7,5,4,3,3,5,5], chartIps: [1,2,2,3,2,2,1,1,2,2], chartBandwidth: [5,10,9,13,9,8,5,5,9,9] },
      '24h': { bandwidth: '312.80 KB', requests: 155, uniqueIps: 48, chartRequests: [10,15,13,20,17,14,10,10,15,14], chartIps: [3,5,4,7,6,5,3,3,5,5], chartBandwidth: [18,28,24,37,32,26,18,18,28,27] },
      '7d':  { bandwidth: '2.10 MB',  requests: 985, uniqueIps: 225, chartRequests: [125,142,138,155,145,108,142], chartIps: [30,34,32,37,35,26,34], chartBandwidth: [252,288,278,314,294,218,288] },
    },
  },
};

function Sparkline({
  data,
  color = 'var(--color-primary-500)',
  height = 52,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  const w = 400;
  const h = height;
  const pad = 4;
  const max = Math.max(...data, 1);
  const step = (w - pad * 2) / (data.length - 1);

  const pts = data.map((v, i) => ({
    x: pad + i * step,
    y: h - pad - ((v / max) * (h - pad * 2)),
  }));

  const linePath = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  const areaPath =
    `M${pts[0].x.toFixed(1)},${h - pad} ` +
    pts.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
    ` L${pts[pts.length - 1].x.toFixed(1)},${h - pad} Z`;

  const gradId = `grad-${color.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="analytics-sparkline"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="analytics-section">
      <button
        className="analytics-section__header"
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="analytics-section__title">{title}</span>
        <svg
          className={`analytics-section__chevron${open ? ' analytics-section__chevron--open' : ''}`}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <div className="analytics-section__body">{children}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const { setPortalCtx } = useOutletContext<AdminOutletContext>();

  const [period, setPeriod] = useState<Period>('6h');
  const [pageTab, setPageTab] = useState<PageTab>('analytics');
  const [mainTab, setMainTab] = useState<MainTab>('paises');

  const portalSite = loadPortalSite(siteId ?? '');
  const site = portalSite ? { id: portalSite.siteId, link: portalSite.link, cliente: portalSite.cliente } : undefined;
  // Analytics data is illustrative — real data will come from Vercel Analytics API in a future integration
  const analytics = ANALYTICS_DB['s1'];

  useEffect(() => {
    if (site) setPortalCtx({ name: site.cliente, backTo: '/admin/portais' });
    return () => setPortalCtx(null);
  }, [site?.id]);

  if (!site) {
    return (
      <div className="page">
        <div className="page-placeholder">
          <h2>Site não encontrado</h2>
          <p>O site solicitado não existe ou foi removido.</p>
          <button className="btn-primary" type="button" onClick={() => navigate('/admin/portais')}>
            Voltar para Portais
          </button>
        </div>
      </div>
    );
  }

  const pd = analytics.periods[period];

  const PERIODS: { key: Period; label: string }[] = [
    { key: '1h',  label: 'Última hora' },
    { key: '6h',  label: 'Últimas 6 horas' },
    { key: '24h', label: 'Últimas 24 horas' },
    { key: '7d',  label: 'Últimos 7 dias' },
  ];

  const PAGE_TABS: { key: PageTab; label: string }[] = [
    { key: 'analytics',  label: 'Analytics' },
    { key: 'logs',       label: 'Logs de acesso' },
    { key: 'erros5xx',  label: 'Código de erro 5xx' },
    { key: 'erros4xx',  label: 'Código de erro 4xx' },
  ];

  const MAIN_TABS: { key: MainTab; label: string }[] = [
    { key: 'paises',       label: 'Países' },
    { key: 'ips',          label: 'Endereços IP' },
    { key: 'solicitacoes', label: 'Solicitações' },
    { key: 'dominios',     label: 'Domínios' },
  ];

  const listData = analytics[mainTab];
  const listMax = Math.max(...listData.map((r) => r.value), 1);

  return (
    <div className="page analytics-page">

      {/* Breadcrumb */}
      <div className="painel-breadcrumb">
        <button
          className="painel-breadcrumb__back"
          type="button"
          onClick={() => navigate('/admin/portais')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Portais
        </button>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="painel-breadcrumb__sep">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <button
          className="painel-breadcrumb__back"
          type="button"
          onClick={() => navigate(`/admin/portais/${siteId}/painel`)}
        >
          {site.link}
        </button>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="painel-breadcrumb__sep">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="painel-breadcrumb__current">Analytics</span>
      </div>

      {/* Summary header */}
      <div className="analytics-summary">
        <div className="analytics-summary__left">
          <div className="analytics-summary__domain">
            <span className="analytics-summary__domain-name">{site.link}</span>
            <span className="badge badge--gray analytics-summary__domain-tag">domínio apresentado</span>
          </div>
          <div className="analytics-summary__metrics">
            <div className="analytics-summary__metric">
              <span className="analytics-summary__metric-value">{pd.bandwidth}</span>
              <span className="analytics-summary__metric-label">Largura de banda total</span>
            </div>
            <div className="analytics-summary__metric-divider" />
            <div className="analytics-summary__metric">
              <span className="analytics-summary__metric-value">{pd.requests.toLocaleString('pt-BR')}</span>
              <span className="analytics-summary__metric-label">Total de solicitações</span>
            </div>
          </div>
        </div>
        <div className="analytics-summary__right">
          <label className="analytics-summary__select-label" htmlFor="analytics-domain-select">
            Alterar domínio
          </label>
          <select id="analytics-domain-select" className="analytics-summary__select">
            <option>{site.link}</option>
          </select>
        </div>
      </div>

      {/* Period pills */}
      <div className="analytics-periods">
        <span className="analytics-periods__label">Filtrar por</span>
        <div className="analytics-periods__pills">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`analytics-period-pill${period === p.key ? ' analytics-period-pill--active' : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Page tab bar */}
      <div className="analytics-tabs">
        {PAGE_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`analytics-tab${pageTab === t.key ? ' analytics-tab--active' : ''}`}
            onClick={() => setPageTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {pageTab === 'analytics' ? (
        <div className="analytics-body">
          {/* Chart columns */}
          <div className="analytics-charts">

            <CollapsibleSection title="Total de solicitações">
              <div className="analytics-chart-meta">
                <span className="analytics-chart-total">{pd.requests.toLocaleString('pt-BR')}</span>
                <span className="analytics-chart-sublabel">solicitações no período</span>
              </div>
              <Sparkline data={pd.chartRequests} color="var(--color-primary-500)" />
            </CollapsibleSection>

            <CollapsibleSection title="Endereço de IP exclusivo">
              <div className="analytics-chart-meta">
                <span className="analytics-chart-total">{pd.uniqueIps.toLocaleString('pt-BR')}</span>
                <span className="analytics-chart-sublabel">IPs únicos no período</span>
              </div>
              <Sparkline data={pd.chartIps} color="var(--color-secondary-500)" />
            </CollapsibleSection>

            <CollapsibleSection title="Largura de banda" defaultOpen={false}>
              <div className="analytics-chart-meta">
                <span className="analytics-chart-total">{pd.bandwidth}</span>
                <span className="analytics-chart-sublabel">largura de banda no período</span>
              </div>
              <Sparkline data={pd.chartBandwidth} color="var(--color-tertiary-500)" />
            </CollapsibleSection>

          </div>

          {/* Sidebar: Lista principal */}
          <aside className="analytics-sidebar">
            <div className="analytics-sidebar__header">
              <span className="analytics-sidebar__title">Lista principal</span>
            </div>
            <div className="analytics-sidebar__tabs">
              {MAIN_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`analytics-sidebar__tab${mainTab === t.key ? ' analytics-sidebar__tab--active' : ''}`}
                  onClick={() => setMainTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <ol className="analytics-sidebar__list">
              {listData.map((row, i) => {
                const pct = Math.round((row.value / listMax) * 100);
                return (
                  <li key={row.name} className="analytics-sidebar__item">
                    <span className="analytics-sidebar__rank">{i + 1}</span>
                    <div className="analytics-sidebar__item-content">
                      <div className="analytics-sidebar__item-top">
                        <span className="analytics-sidebar__item-name">{row.name}</span>
                        <span className="analytics-sidebar__item-value">{row.value.toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="analytics-sidebar__bar-track">
                        <div
                          className="analytics-sidebar__bar-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </aside>
        </div>
      ) : (
        <div className="analytics-placeholder">
          <div className="analytics-placeholder__icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <p className="analytics-placeholder__text">
            {PAGE_TABS.find((t) => t.key === pageTab)?.label} — em breve
          </p>
        </div>
      )}

    </div>
  );
}
