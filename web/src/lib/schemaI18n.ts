import { useI18n } from '../i18n';

/**
 * Schema i18n helper for Cloud Configurator.
 * Translates category / group / field strings that are otherwise hard-coded in MASTER_SCHEMA (English).
 * Falls back to the original English string if no translation exists for the current language.
 */

export function useSchemaT() {
  const { t } = useI18n();
  return (key: string, fallback: string) => {
    const v = t(key);
    // t returns key itself if missing; detect that and fallback
    if (v === key) return fallback;
    return v;
  };
}

export function tSchemaKeyForCategory(id: string) { return `schema.category.${id}`; }
export function tSchemaKeyForGroup(id: string) { return `schema.group.${id}`; }
export function tSchemaKeyForField(key: string) { return `schema.field.${key}`; }
export function tSchemaKeyForOption(value: string) { return `schema.option.${value}`; }

// Helper to get translated label for a select/radio option value
export function translateOption(_lang: string, t: (k:string)=>string, value: string): string {
  const k = `schema.option.${value}`;
  const v = t(k);
  return v === k ? value : v;
}
