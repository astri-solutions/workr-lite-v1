import PORTAL_CONFIG, { ALL_LOCALES, LocaleCode } from '../portalConfig';
import './LangTabs.css';

interface Props {
  active: LocaleCode;
  onChange: (code: LocaleCode) => void;
}

const FLAG_SVGS: Record<string, string> = {
  'pt-BR': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 14">
    <rect width="20" height="14" fill="#009C3B"/>
    <polygon points="10,1 19,7 10,13 1,7" fill="#FEDF00"/>
    <circle cx="10" cy="7" r="3.2" fill="#002776"/>
    <path d="M7,6.3 Q10,5.2 13,6.3" stroke="#fff" stroke-width="0.6" fill="none"/>
  </svg>`,
  'en': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 14">
    <rect width="20" height="14" fill="#B22234"/>
    <rect y="1.08" width="20" height="1.08" fill="#fff"/>
    <rect y="3.23" width="20" height="1.08" fill="#fff"/>
    <rect y="5.38" width="20" height="1.08" fill="#fff"/>
    <rect y="7.54" width="20" height="1.08" fill="#fff"/>
    <rect y="9.69" width="20" height="1.08" fill="#fff"/>
    <rect y="11.85" width="20" height="1.08" fill="#fff"/>
    <rect width="8" height="7.54" fill="#3C3B6E"/>
    <g fill="#fff">
      <circle cx="1.3" cy="1.3" r="0.5"/><circle cx="2.65" cy="1.3" r="0.5"/><circle cx="4" cy="1.3" r="0.5"/>
      <circle cx="5.35" cy="1.3" r="0.5"/><circle cx="6.7" cy="1.3" r="0.5"/>
      <circle cx="2" cy="2.6" r="0.5"/><circle cx="3.35" cy="2.6" r="0.5"/><circle cx="4.7" cy="2.6" r="0.5"/>
      <circle cx="6" cy="2.6" r="0.5"/>
      <circle cx="1.3" cy="3.9" r="0.5"/><circle cx="2.65" cy="3.9" r="0.5"/><circle cx="4" cy="3.9" r="0.5"/>
      <circle cx="5.35" cy="3.9" r="0.5"/><circle cx="6.7" cy="3.9" r="0.5"/>
      <circle cx="2" cy="5.2" r="0.5"/><circle cx="3.35" cy="5.2" r="0.5"/><circle cx="4.7" cy="5.2" r="0.5"/>
      <circle cx="6" cy="5.2" r="0.5"/>
      <circle cx="1.3" cy="6.5" r="0.5"/><circle cx="2.65" cy="6.5" r="0.5"/><circle cx="4" cy="6.5" r="0.5"/>
      <circle cx="5.35" cy="6.5" r="0.5"/><circle cx="6.7" cy="6.5" r="0.5"/>
    </g>
  </svg>`,
  'es': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 14">
    <rect width="20" height="14" fill="#AA151B"/>
    <rect y="3.5" width="20" height="7" fill="#F1BF00"/>
  </svg>`,
};

function FlagSvg({ code }: { code: string }) {
  const svg = FLAG_SVGS[code];
  if (!svg) return null;
  const encoded = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  return <img src={encoded} alt={code} className="lang-tab__flag-img" aria-hidden="true" />;
}

export default function LangTabs({ active, onChange }: Props) {
  const enabled = ALL_LOCALES.filter(l => (PORTAL_CONFIG.languages as readonly string[]).includes(l.code));
  if (enabled.length <= 1) return null;

  return (
    <div className="lang-tabs">
      {enabled.map(l => (
        <button
          key={l.code}
          type="button"
          className={`lang-tab${active === l.code ? ' lang-tab--active' : ''}`}
          onClick={() => onChange(l.code)}
        >
          <FlagSvg code={l.code} />
          {l.label}
        </button>
      ))}
    </div>
  );
}
