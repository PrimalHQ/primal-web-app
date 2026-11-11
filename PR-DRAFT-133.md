# PR DRAFT — DO NOT COMMIT THIS FILE (local only, for the push/PR step)

## Title

Add inline note translation (#133)

## Body

close #133

Lightning Bounties: https://app.lightningbounties.com/issue/0673c66a-9e42-49b6-a56f-1182642873b6

## Summary

Implements the requested per-post translation, like X: a **Translate** control
below text notes translates the note into the language configured in Settings
(falling back to the app language, then the browser language). The translated
text is shown inline in place of the original, with a **Show original** /
**Show translation** toggle and the detected source language
("Translated from Spanish"). If a note is already in the target language it
says so instead of translating. If the service is unavailable, the note keeps
its original text and offers a retry.

## What changed

- `src/lib/translate.ts` (new) — LibreTranslate-compatible translation client:
  - Default endpoint is the public Argos Translate demo instance
    (`https://translate.argosopentech.com`); a custom endpoint and an optional
    API key can be set on the new Settings page, so no key is required
    out of the box and no undocumented translation endpoint is used.
  - Nostr references (`nostr:` URIs, bare bech32), links, hashtags, `#[n]`
    mentions, Lightning invoices, Cashu tokens and Bitcoin addresses are
    replaced with placeholders before translation and restored afterwards,
    so they are never mangled.
  - Translations are cached in `localStorage`, keyed by a hash of
    endpoint + target language + source text (bounded to 200 entries),
    so the same note is never translated twice.
  - Requests time out after 15s and failures surface as an error the UI
    shows gracefully.
- `src/components/Note/NoteTranslation/` (new) — renders the note through the
  existing `ParsedNote` and adds the Translate control below the content.
  Only plain text notes (kind 1) with translatable words get the control;
  polls, articles and media-only notes are untouched.
- `src/components/Note/Note.tsx`, `src/components/Note/NotePrimary/NotePrimary.tsx`
  — feed, thread and primary note views render through `NoteTranslation`.
- `src/pages/Settings/Translation.tsx` (new), `src/pages/Settings/Menu.tsx`,
  `src/Router.tsx` — new **Settings > Translation** page: target language
  (30 languages, or follow the app language), service URL, optional API key,
  reset to defaults.
- `src/translations.ts` — UI strings for the control and the settings page
  via the app's i18n system (`actions.noteTranslation`,
  `settings.translation`).

## Verification

- `npm run build` — production build passes.
- `npx tsc --noEmit` — no errors in the changed files (the single reported
  error is pre-existing in `src/components/PrimalMarkdown/MarkdownEditor.tsx`,
  untouched by this PR).
- Translation library unit checks (entity protection round-trip, cache,
  request shape, failure handling) — 32/32 pass; the checks live in
  `/tmp/test-translate.mjs` and are not part of the PR, since the repo has
  no test runner configured.
- No new dependencies. No existing feature touched besides the four note
  render call sites above.

## Notes for the reviewer

- A live translation through the default endpoint could not be verified
  from the machine this was developed on (the demo host is unreachable
  from that network; the official LibreTranslate hosts require an API key,
  so they are not a keyless default). The provider is therefore
  configurable in Settings, and the feature degrades gracefully when the
  endpoint is unreachable. Please verify one live translation from a
  normal network before merging.
- This follows the direction discussed on the issue: inline translation,
  entity protection, client-side caching, i18n UI strings, and an
  explicitly configured provider boundary.
