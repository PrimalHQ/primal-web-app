import { shieldNoteText } from './noteTranslateProtect.ts';

export type TranslationShield = {
  payload: string;
  slots: string[];
  namespace: string;
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');

const namespacePattern = (namespace: string): string =>
  namespace.split('').map(escapeRegExp).join('\\s*');

const sourceContainsNamespace = (source: string, namespace: string): boolean =>
  new RegExp(namespacePattern(namespace), 'i').test(source || '');

const chooseNamespace = (source: string): string => {
  let index = 0;
  while (sourceContainsNamespace(source, 'PRIMALNTX' + index)) index += 1;
  return 'PRIMALNTX' + index;
};

const slotPattern = (namespace: string): RegExp => {
  const ns = namespacePattern(namespace);
  return new RegExp(
    '⟦\\s*' + ns + '\\s*:\\s*(\\d{1,3})\\s*⟧|' +
    '\\[\\s*' + ns + '\\s*:\\s*(\\d{1,3})\\s*\\]|' +
    '\\b' + ns + '\\s*:?\\s*(\\d{1,3})\\b',
    'gi',
  );
};

export const shieldNoteTextForTranslation = (source: string): TranslationShield => {
  const namespace = chooseNamespace(source);
  const base = shieldNoteText(source, namespace);
  return { payload: base.payload, slots: base.slots, namespace };
};

// Validate the response before restoring or caching it. Each generated slot must
// occur exactly once; an unknown or unrecognized marker is also a failure.
export const hasIntactTranslationSlots = (
  translated: string,
  slots: string[],
  namespace: string,
): boolean => {
  const seen = new Set<number>();
  for (const match of translated.matchAll(slotPattern(namespace))) {
    const index = Number.parseInt(match[1] ?? match[2] ?? match[3], 10);
    if (!Number.isInteger(index) || index < 0 || index >= slots.length || seen.has(index)) {
      return false;
    }
    seen.add(index);
  }
  return seen.size === slots.length &&
    !sourceContainsNamespace(translated.replace(slotPattern(namespace), ''), namespace);
};

export const restoreNoteTextForTranslation = (
  translated: string,
  slots: string[],
  namespace: string,
): string => {
  if (!translated) return '';

  return translated.replace(slotPattern(namespace), (full, a, b, c) => {
    const raw = a ?? b ?? c;
    const index = Number.parseInt(raw, 10);
    if (!Number.isFinite(index) || index < 0 || index >= slots.length) {
      return full;
    }
    return slots[index];
  });
};

export const stripTranslationPlaceholders = (
  payload: string,
  namespace: string,
): string => payload.replace(slotPattern(namespace), ' ');
