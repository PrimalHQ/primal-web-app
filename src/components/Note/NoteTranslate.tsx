import { Component, createSignal, Show } from 'solid-js';
import { PrimalNote } from '../../types/primal';
import {
  cacheTranslation,
  decodeNoteContent,
  getCachedTranslation,
  getTranslateLang,
  translateNoteContent,
  TranslationResult,
} from '../../lib/noteTranslation';

import styles from './Note.module.scss';

const NoteTranslate: Component<{ note: PrimalNote }> = (props) => {
  const [translated, setTranslated] = createSignal<TranslationResult | undefined>(undefined);
  const [translating, setTranslating] = createSignal(false);
  const [failed, setFailed] = createSignal(false);

  const translate = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (translating()) return;

    const target = getTranslateLang();
    const cached = getCachedTranslation(props.note.id, target);

    if (cached) {
      setTranslated(cached);
      return;
    }

    setTranslating(true);
    setFailed(false);

    const result = await translateNoteContent(props.note.content, target);

    setTranslating(false);

    if (result) {
      cacheTranslation(props.note.id, target, result);
      setTranslated(result);
    } else {
      setFailed(true);
    }
  };

  const showOriginal = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setTranslated(undefined);
    setFailed(false);
  };

  return (
    <Show when={props.note.content.trim().length > 0}>
      <div class={styles.noteTranslate} onClick={(e) => e.stopPropagation()}>
        <Show
          when={translated() === undefined}
          fallback={
            <div class={styles.noteTranslated}>
              <div class={styles.noteTranslatedText}>{translated()?.text}</div>
              <div class={styles.noteTranslatedMeta}>
                <span>
                  {translated()?.engine === 'google'
                    ? 'Translated by Google Translate'
                    : 'Translated by LibreTranslate'}
                </span>
                <button class={styles.noteTranslateButton} onClick={showOriginal}>
                  Show original
                </button>
              </div>
            </div>
          }
        >
          <Show
            when={!failed()}
            fallback={
              <div class={styles.noteTranslateError}>
                Translation is unavailable right now. Please try again later.
              </div>
            }
          >
            <button
              class={styles.noteTranslateButton}
              onClick={translate}
              disabled={translating()}
            >
              {translating() ? 'Translating…' : 'Translate'}
            </button>
          </Show>
        </Show>
      </div>
    </Show>
  );
};

export default NoteTranslate;
