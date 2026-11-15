/**
 * Lightweight, dependency-free language guesser for note content.
 *
 * This is deliberately pragmatic: it only decides whether the "Translate"
 * action is worth offering (a note that is almost certainly already in the
 * user's language doesn't need one). It is NOT the source of truth for the
 * note's language — the translation provider reports the detected source
 * language with every translation, and that is what the UI displays.
 *
 * Strategy: Unicode script ranges first (very reliable), then stopword
 * scoring for the Latin-script languages common on Nostr.
 */

// [regex, ISO 639-1 code] — scripts that map (almost) 1:1 to a language.
const SCRIPT_RANGES: [RegExp, string][] = [
  [/[\u3040-\u30ff]/, 'ja'], // Hiragana / Katakana
  [/[\uac00-\ud7af]/, 'ko'], // Hangul
  [/[\u4e00-\u9fff]/, 'zh'], // Han (no kana present -> Chinese)
  [/[\u0e00-\u0e7f]/, 'th'], // Thai
  [/[\u0900-\u097f]/, 'hi'], // Devanagari
  [/[\u0590-\u05ff]/, 'he'], // Hebrew
  [/[\u0600-\u06ff]/, 'ar'], // Arabic
  [/[\u0370-\u03ff]/, 'el'], // Greek
];

// Cyrillic is shared; a few letters disambiguate the common cases.
const CYRILLIC_RE = /[\u0400-\u04ff]/;
const UKRAINIAN_RE = /[\u0454\u0456\u0457\u0491]/i;
const SERBIAN_RE = /[\u0452\u0455\u0458\u0459\u045a\u045b]/i;

// Small stopword sets for Latin-script languages. Only used when the text
// is long enough for the scores to mean anything.
const STOPWORDS: Record<string, string[]> = {
  en: ['the', 'and', 'is', 'of', 'to', 'in', 'that', 'it', 'was', 'for', 'on', 'are', 'with', 'as', 'i', 'his', 'they', 'be', 'at', 'one', 'have', 'this', 'from', 'or', 'had', 'by', 'word', 'but', 'not', 'what', 'all', 'were', 'we', 'when', 'your', 'can', 'said', 'there', 'use', 'an', 'each', 'which'],
  es: ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'ser', 'se', 'no', 'haber', 'por', 'con', 'su', 'para', 'como', 'estar', 'tener', 'le', 'lo', 'todo', 'pero', 'más', 'hacer', 'o', 'poder', 'decir', 'este', 'ir', 'otro', 'ese', 'cuando', 'él', 'muy', 'sin', 'vez', 'mucho', 'saber', 'qué', 'sobre', 'también', 'hasta', 'donde'],
  pt: ['o', 'a', 'de', 'e', 'do', 'da', 'que', 'em', 'um', 'para', 'com', 'não', 'uma', 'os', 'no', 'se', 'na', 'por', 'são', 'ao', 'das', 'como', 'mais', 'dos', 'mas', 'foi', 'também', 'está', 'eu', 'isso', 'já', 'muito', 'quando', 'sobre', 'onde', 'mesmo'],
  fr: ['le', 'de', 'un', 'être', 'et', 'à', 'il', 'avoir', 'ne', 'je', 'son', 'que', 'se', 'qui', 'ce', 'dans', 'en', 'du', 'elle', 'au', 'plus', 'pas', 'ce', 'pour', 'déjà', 'été', 'les', 'des', 'est', 'sur', 'vous', 'nous', 'mon', 'avec', 'tout', 'faire', 'leur', 'mais'],
  de: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ein', 'eine', 'als', 'auch', 'es', 'an', 'werden', 'aus', 'er', 'hat', 'dass', 'sie', 'nach', 'wird', 'bei', 'einer', 'um', 'am', 'sind', 'noch', 'wie', 'einem', 'über', 'einen', 'so', 'zum'],
  it: ['il', 'di', 'che', 'e', 'la', 'per', 'un', 'una', 'in', 'del', 'sono', 'dei', 'delle', 'nel', 'gli', 'le', 'si', 'più', 'anche', 'ma', 'come', 'da', 'della', 'questo', 'non', 'ci', 'se', 'lo', 'essere', 'io', 'mi', 'cosa', 'quando', 'fare', 'ora', 'dopo'],
  nl: ['de', 'het', 'een', 'van', 'ik', 'te', 'dat', 'die', 'in', 'een', 'hij', 'het', 'zijn', 'is', 'op', 'aan', 'met', 'voor', 'zijn', 'ik', 'niet', 'aan', 'tot', 'er', 'ook', 'als', 'bij', 'om', 'dit', 'aan', 'nog', 'maar', 'uit', 'door', 'over', 'ze', 'zich', 'bij', 'nu', 'waar', 'wie'],
  id: ['yang', 'dan', 'di', 'ini', 'itu', 'dengan', 'untuk', 'tidak', 'dari', 'dalam', 'akan', 'pada', 'juga', 'saya', 'ke', 'adalah', 'oleh', 'karena', 'ada', 'telah', 'sebagai', 'bisa', 'atau', 'sudah', 'mereka', 'lebih', 'seperti', 'harus', 'kita', 'banyak', 'orang', 'jadi', 'ketika', 'sebuah', 'dapat', 'lagi', 'hanya'],
  tr: ['bir', 've', 'bu', 'ne', 'da', 'de', 'için', 'çok', 'olarak', 'gibi', 'daha', 'en', 'olan', 'sonra', 'önce', 'kadar', 'nasıl', 'şey', 'her', 'zaman', 'ya', 'ise', 'ama', 'belki', 'şu', 'o', 'ki', 'üzere', 'tarafından', 'göre', 'rağmen', 'dolayı', 'hem', 'artık', 'kendi', 'ile', 'olan', 'böyle', 'şöyle'],
  pl: ['i', 'w', 'z', 'na', 'nie', 'to', 'się', 'że', 'jest', 'do', 'tak', 'jak', 'co', 'o', 'ale', 'po', 'za', 'tym', 'już', 'tylko', 'jeszcze', 'przez', 'gdy', 'ich', 'bardzo', 'który', 'które', 'był', 'była', 'tego', 'tej', 'tym', 'są', 'można', 'jako', 'jeśli', 'więc', 'też', 'przy'],
};

const MIN_WORDS_FOR_STOPWORDS = 4;

/**
 * Guess the ISO 639-1 language of `text`.
 * Returns `undefined` when there isn't enough signal to say anything.
 */
export const detectLanguage = (text: string): string | undefined => {
  const sample = (text || '').trim();
  if (sample.length < 3) return undefined;

  for (const [re, code] of SCRIPT_RANGES) {
    if (re.test(sample)) return code;
  }

  if (CYRILLIC_RE.test(sample)) {
    if (UKRAINIAN_RE.test(sample)) return 'uk';
    if (SERBIAN_RE.test(sample)) return 'sr';
    return 'ru';
  }

  const words = sample.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
  if (words.length < MIN_WORDS_FOR_STOPWORDS) return undefined;

  let best: string | undefined;
  let bestScore = 0;
  let secondScore = 0;

  for (const [lang, stopwords] of Object.entries(STOPWORDS)) {
    const set = new Set(stopwords);
    const score = words.reduce((acc, w) => acc + (set.has(w) ? 1 : 0), 0);
    if (score > bestScore) {
      secondScore = bestScore;
      bestScore = score;
      best = lang;
    } else if (score > secondScore) {
      secondScore = score;
    }
  }

  // Require a clear winner: at least 2 hits and strictly ahead.
  if (!best || bestScore < 2 || bestScore <= secondScore) return undefined;

  return best;
};

/** Primary language subtag of a BCP-47-ish tag: 'en-US' -> 'en'. */
export const primaryLanguageCode = (lang: string | undefined): string => {
  const trimmed = (lang || '').trim().toLowerCase();
  if (!trimmed) return 'en';
  return trimmed.split(/[-_]/)[0] || 'en';
};
