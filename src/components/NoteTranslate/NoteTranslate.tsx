import { Component, createMemo, createSignal, Show } from 'solid-js';
import { useIntl } from '@cookbook/solid-intl';
import { PrimalNote } from '../../types/primal';
import {
  translateNoteContent,
  TranslationError,
  DEFAULT_TRANSLATE_TARGET,
} from '../../lib/translation';
import {
  loadTranslationSettings,
} from '../../lib/translationSettings';
import { noteTranslation as t } from '../../translations';
import { hookForDev } from '../../lib/devTools';

import styles from './NoteTranslate.module.scss';

type TranslateState = 'idle' | 'loading' | 'done' | 'error';

/**
 * Inline translate control rendered below note content (issue #133).
 *
 * - "Translate" button fetches a translation and renders it inline.
 * - "Show original" toggles back to the note's source text.
 * - Shows the detected source language when available.
 * - Translations are cached client-side (see lib/translation.ts).
 * - Fails gracefully with a short message if the service is unreachable.
 */
const NoteTranslate: Component<{ note: PrimalNote, id?: string }> = (props) => {
  const intl = useIntl();

  const [state, setState] = createSignal<TranslateState>('idle');
  const [translated, setTranslated] = createSignal('');
  const [detectedLang, setDetectedLang] = createSignal('');
  const [errorMsg, setErrorMsg] = createSignal('');

  const settings = createMemo(() => loadTranslationSettings());

  const doTranslate = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // toggle off if already translated
    if (state() === 'done') {
      setState('idle');
      return;
    }

    const cfg = settings();
    if (!cfg.enabled) return;

    const content = props.note.content || '';
    if (content.trim().length === 0) return;

    const target = cfg.targetLang || DEFAULT_TRANSLATE_TARGET();

    setState('loading');
    setErrorMsg('');

    try {
      const result = await translateNoteContent(content, target, cfg.endpoint, cfg.apiKey);
      setTranslated(result.translatedText);
      setDetectedLang(result.detectedLanguage || '');
      setState('done');
    } catch (err) {
      const e = err as TranslationError;
      setErrorMsg(e.message || intl.formatMessage(t.translateFailed));
      setState('error');
    }
  };

  const isExpanded = () => state() === 'done';

  return (
    <div class={styles.noteTranslate} id={props.id}>
      <Show when={state() === 'done'}>
        <div class={styles.translation}>{translated()}</div>
      </Show>

      <Show when={state() === 'error'}>
        <div class={styles.error}>{errorMsg()}</div>
      </Show>

      <button
        class={`${styles.translateButton} ${isExpanded() ? styles.active : ''}`}
        onClick={doTranslate}
        disabled={state() === 'loading'}
        title={intl.formatMessage(t.translateNote)}
      >
        <Show
          when={state() !== 'loading'}
          fallback={<span class={styles.spinner} />}
        >
          <span class={styles.icon} aria-hidden="true">{"\u{1F310}"}</span>
        </Show>
        <span class={styles.label}>
          <Show when={!isExpanded()} fallback={intl.formatMessage(t.showOriginal)}>
            {intl.formatMessage(t.translateNote)}
          </Show>
        </span>
        <Show when={isExpanded() && detectedLang()}>
          <span class={styles.detected}>{"\u00b7"} {detectedLang()}</span>
        </Show>
      </button>
    </div>
  );
};

export default hookForDev(NoteTranslate);
