const ALL_LOCALES = [
  { code: 'pt-BR', label: 'PT-BR', flag: '🇧🇷' },
  { code: 'en',    label: 'EN',    flag: '🇺🇸' },
  { code: 'es',    label: 'ES',    flag: '🇪🇸' },
] as const;

export type LocaleCode = typeof ALL_LOCALES[number]['code'];

// Model chosen at portal creation. Controls which layout options are available in LayoutPage:
//   'sidebar' | 'tabmenu' → compact versions (B3/CVM mandatory content only). User can switch between the two.
//   'banner'              → full version (internal pages + rich content). Layout is locked — cannot be changed here.
export type PortalModel = 'sidebar' | 'tabmenu' | 'banner';

function getLanguages(): LocaleCode[] {
  try {
    const raw = localStorage.getItem('portal_idiomas');
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as LocaleCode[];
    }
  } catch { /* ignore */ }
  return ['pt-BR'];
}

function getPortalName(): string {
  try {
    const auth = localStorage.getItem('workr_auth');
    if (auth) {
      const parsed = JSON.parse(auth);
      const portais = parsed?.portais ?? [];
      const activeId = parsed?.activePortalId;
      const active = portais.find((p: { id: string }) => p.id === activeId) ?? portais[0];
      if (active?.nome) return active.nome;
    }
  } catch { /* ignore */ }
  return '';
}

function getPortalModel(): PortalModel {
  try {
    const auth = localStorage.getItem('workr_auth');
    if (auth) {
      const parsed = JSON.parse(auth);
      const activeId = parsed?.activePortalId;
      if (activeId) {
        const stored = localStorage.getItem(`portal_layout_${activeId}`);
        if (stored === 'sidebar' || stored === 'tabmenu' || stored === 'banner') return stored;
      }
    }
  } catch { /* ignore */ }
  return 'sidebar';
}

const PORTAL_CONFIG = {
  get name() { return getPortalName(); },
  get languages() { return getLanguages(); },
  get model(): PortalModel { return getPortalModel(); },
  orgType: 'trimestral',
};

export { ALL_LOCALES };
export default PORTAL_CONFIG;
