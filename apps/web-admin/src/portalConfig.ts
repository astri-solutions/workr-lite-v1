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

const PORTAL_CONFIG = {
  get name() { return getPortalName(); },
  orgType: 'trimestral',
  model: 'tabmenu' as PortalModel,
  // Languages enabled for this portal. Edit here to add/remove language tabs across all pages.
  languages: ['pt-BR', 'en', 'es'] as LocaleCode[],
};

export { ALL_LOCALES };
export default PORTAL_CONFIG;
