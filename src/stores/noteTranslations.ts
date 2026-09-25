// Global note-translation store.
// Persists across re-renders, scroll and component unmounts so a translated
// note stays translated wherever it is rendered (feed, thread, profile...).

import { createStore } from 'solid-js/store';

// noteId -> translated text
export const [translatedNotes, setTranslatedNotes] = createStore<Record<string, string>>({});
// noteId -> true when the user asked to see the original text again
export const [showOriginalNotes, setShowOriginalNotes] = createStore<Record<string, boolean>>({});

export const isNoteTranslated = (noteId: string | undefined) =>
  !!noteId && !!translatedNotes[noteId];

export const getNoteTranslation = (noteId: string | undefined) =>
  noteId ? translatedNotes[noteId] : undefined;

export const isOriginalShown = (noteId: string | undefined) =>
  !!noteId && !!showOriginalNotes[noteId];

export const setNoteTranslation = (noteId: string, translated: string) => {
  setTranslatedNotes(noteId, translated);
  setShowOriginalNotes(noteId, false);
};

export const toggleOriginal = (noteId: string) => {
  setShowOriginalNotes(noteId, !showOriginalNotes[noteId]);
};
