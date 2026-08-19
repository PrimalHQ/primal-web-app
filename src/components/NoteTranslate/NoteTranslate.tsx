import { Component, createSignal, Show } from 'solid-js';
import { useIntl } from '@cookbook/solid-intl';
import { PrimalNote } from '../../types/primal';
import {
  hasTranslatableContent,
  translateNoteContent,
  TranslationError,
} from '../../lib/translation';
import { loadTranslationSettings } from '../../lib/translationSettings';
import { noteTranslation as t } from '../../translations';
import { hookForDev } from '../../lib/devTools';

import styles from './NoteTranslate.module.scss';

type TranslateState = 'idle' | 'loading' | 'done' | 'error';

/**
 * Inline Translate / Show-original control rendered below kind-1 note content
 * (issue #133).
 *
 * - "Translate" fetches a translation and renders it inline.
 * - "Show original" collapses the translation back to the source text.
 * - Shows the detected source language when the provider returns it.
 * - Translations are cached client-side (see lib/translation.ts).
 * - Fails gracefully with a short message when the service is unavailable.
 */
const NoteTranslate: Component<{ note: PrimalNote, id?: string }> = (props) => {

  const intl = useIntl();

  const [state, setState] = createSignal<TranslateState>('idle');
  const [translated, setTranslated] = createSignal('');
  const [detectedLang, setDetectedLang] = createSignal('');
  const [errorMsg, setErrorMsg] = createSignal('');

  const content = () => props.note.content || '';

  const shouldShow = () => {
    const settings = loadTranslationSettings();
    if (!settings.enabled) return false;
    if (content().trim().length === 0) return false;
    return hasTranslatableContent(content());
  };

  const onToggle = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // "Show original" — collapse the translation.
    if (state() === 'done') {
      setState('idle');
      return;
    }

    if (state() === 'loading') return;

    const settings = loadTranslationSettings();
    if (!settings.enabled) return;

    setState('loading');
    setErrorMsg('');

    try {
      const result = await translateNoteContent(
        content(),
        settings.targetLang,
        settings.endpoint,
        settings.apiKey,
      );
      setTranslated(result.translatedText);
      setDetectedLang(result.detectedLanguage || '');
      setState('done');
    } catch (err) {
      const error = err as TranslationError;
      setErrorMsg(error.message || intl.formatMessage(t.translateFailed));
      setState('error');
    }
  };

  return (
    <Show when={shouldShow()}>
      <div class={styles.noteTranslate} id={props.id}>
        <Show when={state() === 'done'}>
          <div class={styles.translation}>{translated()}</div>
        </Show>

        <Show when={state() === 'error'}>
          <div class={styles.error}>{errorMsg()}</div>
        </Show>

        <button
          class={`${styles.translateButton} ${state() === 'done' ? styles.active : ''}`}
          onClick={onToggle}
          disabled={state() === 'loading'}
          title={intl.formatMessage(t.translateNote)}
        >
          <Show
            when={state() !== 'loading'}
            fallback={<span class={styles.spinner} />}
          >
            <span class={styles.icon} aria-hidden="true">{'\u{1F310}'}</span>
          </Show>
          <span class={styles.label}>
            {state() === 'done'
              ? intl.formatMessage(t.showOriginal)
              : intl.formatMessage(t.translateNote)}
          </span>
          <Show when={state() === 'done' && detectedLang()}>
            <span class={styles.detected}>{'\u00B7'} {detectedLang()}</span>
          </Show>
        </button>
      </div>
    </Show>
  );
};

export default hookForDev(NoteTranslate);
