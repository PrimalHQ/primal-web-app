import assert from 'node:assert/strict';
import test from 'node:test';
import { hasTranslatableNoteText } from '../src/lib/translation.ts';

test('offers translation for letters in non-Latin scripts', () => {
  for (const note of ['\u65e5\u672c\u8a9e', '\u0645\u0631\u062d\u0628\u0627']) {
    assert.equal(hasTranslatableNoteText(note), true);
  }
});

test('does not offer translation for a URL and a bare Nostr reference', () => {
  assert.equal(hasTranslatableNoteText('https://example.org/path nostr:npub1abcdef'), false);
});
