const ALL_LOCALES = [
  { code: 'pt-BR', label: 'PT-BR', flag: '🇧🇷' },
  { code: 'en',    label: 'EN',    flag: '🇺🇸' },
  { code: 'es',    label: 'ES',    flag: '🇪🇸' },
] as const;

export type LocaleCode = typeof ALL_LOCALES[number]['code'];

const PORTAL_CONFIG = {
  name: 'IMC Investor Relations',
  orgType: 'trimestral',
  // Languages enabled for this portal. Edit here to add/remove language tabs across all pages.
  languages: ['pt-BR', 'en', 'es'] as LocaleCode[],
} as const;

export { ALL_LOCALES };
export default PORTAL_CONFIG;
