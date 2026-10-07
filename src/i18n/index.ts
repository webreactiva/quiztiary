import config from '../../quiztiary.config.mjs';

// Every locale is bundled; only the active one is used.
// ponytail: a few KB each, split per locale if a host ships dozens.
const all = import.meta.glob<Record<string, unknown>>('./*.json', { eager: true, import: 'default' });
const messages = all[`./${config.locale}.json`];
if (!messages) throw new Error(`quiztiary.config.mjs: locale "${config.locale}" has no src/i18n/${config.locale}.json`);

export const locale: string = config.locale;

/** t('panel.delay', { min: 20, max: 90 }) → the active locale's text with {placeholders} filled. */
export function t(key: string, vars: Record<string, string | number> = {}) {
  const text = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
  if (typeof text !== 'string') return key;
  return text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}
