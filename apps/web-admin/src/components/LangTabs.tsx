import PORTAL_CONFIG, { ALL_LOCALES, LocaleCode } from '../portalConfig';
import './LangTabs.css';

interface Props {
  active: LocaleCode;
  onChange: (code: LocaleCode) => void;
}

// Returns null when the portal has only one language — no tabs needed.
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
          <span className="lang-tab__flag">{l.flag}</span>
          {l.label}
        </button>
      ))}
    </div>
  );
}
