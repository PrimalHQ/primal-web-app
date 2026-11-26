import { Component, Show, createMemo, createSignal } from 'solid-js';
import { useIntl } from '@cookbook/solid-intl';
import { PrimalNote } from '../../types/primal';
import ParsedNote from '../ParsedNote/ParsedNote';
import { translation as t } from '../../translations';
import {
  TranslationResult,
  hasTranslatableNoteText,
  isTranslationConfigured,
  translateNoteContent,
} from '../../lib/translation';
import styles from './NoteTranslation.module.scss';

const NoteTranslation: Component<{
  note: PrimalNote,
  width?: number,
  margins?: number,
  footerSize?: 'xwide' | 'wide' | 'normal' | 'compact' | 'short' | 'mini',
  primary?: boolean,
}> = (props) => {

  const intl = useIntl();

  const [loading, setLoading] = createSignal(false);
  const [showTranslated, setShowTranslated] = createSignal(false);
  const [result, setResult] = createSignal<TranslationResult>();
  const [error, setError] = createSignal('');

  const translatable = () => hasTranslatableNoteText(props.note.content || '');

  const translatedNote = createMemo(() => {
    const translated = result()?.translatedText || props.note.content;

    return {
      ...props.note,
      content: translated,
      post: {
        ...props.note.post,
        content: translated,
      },
    };
  });

  const label = () => {
    if (loading()) return intl.formatMessage(t.translating);
    if (result() && showTranslated()) return intl.formatMessage(t.showOriginal);
    if (result()) return intl.formatMessage(t.showTranslation);

    return intl.formatMessage(t.translate);
  };

  const displayError = () => {
    const code = error();

    if (code === 'translation_endpoint_missing') {
      return intl.formatMessage(t.configureProvider);
    }

    if (code.startsWith('translation_request_failed')) {
      return intl.formatMessage(t.requestFailed);
    }

    return intl.formatMessage(t.genericError);
  };

  const onTranslate = async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (result()) {
      setShowTranslated(show => !show);
      return;
    }

    if (!isTranslationConfigured()) {
      setError('translation_endpoint_missing');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const translation = await translateNoteContent(props.note.content || '');
      setResult(translation);
      setShowTranslated(true);
    }
    catch (e) {
      const message = e instanceof Error ? e.message : 'translation_unknown_error';
      setError(message);
    }
    finally {
      setLoading(false);
    }
  };

  return (
    <Show when={translatable()}>
      <div class={`${styles.translation} ${props.primary ? styles.primary : ''}`}>
        <div class={styles.actions}>
          <button
            type="button"
            class={styles.button}
            disabled={loading()}
            onClick={onTranslate}
          >
            {label()}
          </button>

          <Show when={result()?.detectedLanguage && showTranslated()}>
            <span class={styles.meta}>
              {intl.formatMessage(t.detectedSource, { language: result()?.detectedLanguage })}
            </span>
          </Show>

          <Show when={result()?.fromCache && showTranslated()}>
            <span class={styles.meta}>
              {intl.formatMessage(t.fromCache)}
            </span>
          </Show>
        </div>

        <Show when={error()}>
          <div class={styles.error}>
            {displayError()} <a href="/settings/translation" onClick={event => event.stopPropagation()}>
              {intl.formatMessage(t.settingsLink)}
            </a>
          </div>
        </Show>

        <Show when={result() && showTranslated()}>
          <div class={styles.translated}>
            <ParsedNote
              note={translatedNote()}
              width={props.width}
              margins={props.margins}
              footerSize={props.footerSize}
              noLightbox={true}
              noPreviews={true}
            />
          </div>
        </Show>
      </div>
    </Show>
  );
};

export default NoteTranslation;
