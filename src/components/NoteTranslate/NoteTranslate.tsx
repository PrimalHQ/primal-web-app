import { Component, createEffect, createSignal, onCleanup, Show } from 'solid-js';
import { PrimalNote } from '../../types/primal';
import {
  getCachedNoteTranslation,
  readNoteTranslationPrefs,
  shouldOfferTranslation,
  subscribeNoteTranslation,
  toggleShowOriginal,
  translateNoteContent,
} from '../../lib/translation';
import styles from './NoteTranslate.module.scss';

const NoteTranslate: Component<{ note: PrimalNote }> = (props) => {
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal('');
  const [tick, setTick] = createSignal(0);

  const noteId = () => props.note.id;
  const content = () => props.note.content || props.note.post?.content || '';
  const prefs = () => readNoteTranslationPrefs();
  const entry = () => {
    tick();
    return getCachedNoteTranslation(noteId());
  };

  createEffect(() => {
    const unsub = subscribeNoteTranslation((id) => {
      if (id === noteId()) setTick((n) => n + 1);
    });
    onCleanup(unsub);
  });

  const visible = () => prefs().enabled && shouldOfferTranslation(content());

  const onTranslate = async () => {
    setError('');
    setBusy(true);
    try {
      await translateNoteContent(noteId(), content());
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setError(e?.message || 'Translation failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Show when={visible()}>
      <div class={styles.wrap}>
        <div class={styles.actions}>
          <Show
            when={entry() && !entry()!.showingOriginal}
            fallback={
              <button class={styles.button} disabled={busy()} onClick={onTranslate}>
                {busy() ? 'Translating…' : 'Translate'}
              </button>
            }
          >
            <button class={styles.button} onClick={() => toggleShowOriginal(noteId())}>
              Show original
            </button>
          </Show>
          <Show when={entry()?.showingOriginal}>
            <button class={styles.button} onClick={() => toggleShowOriginal(noteId())}>
              Show translation
            </button>
          </Show>
        </div>

        <Show when={entry() && !entry()!.showingOriginal}>
          <div class={styles.translated}>{entry()!.translated}</div>
          <Show when={entry()!.detected}>
            <div class={styles.meta}>Detected: {entry()!.detected}</div>
          </Show>
        </Show>

        <Show when={error()}>
          <div class={styles.error}>{error()}</div>
        </Show>
      </div>
    </Show>
  );
};

export default NoteTranslate;
