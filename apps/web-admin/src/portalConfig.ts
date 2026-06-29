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

const PORTAL_CONFIG = {
  name: 'IMC Investor Relations',
  orgType: 'trimestral',
  model: 'tabmenu' as PortalModel,
  // Languages enabled for this portal. Edit here to add/remove language tabs across all pages.
  languages: ['pt-BR', 'en', 'es'] as LocaleCode[],
} as const;

export { ALL_LOCALES };
export default PORTAL_CONFIG;
