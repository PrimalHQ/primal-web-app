import { useIntl } from '@cookbook/solid-intl';
import { Component, Show, createSignal } from 'solid-js';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { canTranslateNote, normalizeTranslationLanguage, translateNote } from '../../lib/translate';
import { note as t } from '../../translations';
import { NoteTranslationResponse, PrimalNote } from '../../types/primal';
import ParsedNote from '../ParsedNote/ParsedNote';

import styles from './Note.module.scss';

const languageName = (language: string | undefined, locale: string) => {
  if (!language) return '';

  try {
    const DisplayNames = (Intl as any).DisplayNames;

    if (!DisplayNames) return language;

    const names = new DisplayNames([locale], { type: 'language' });
    return names.of(language) || language;
  } catch {
    return language;
  }
};

const NoteTranslation: Component<{
  note: PrimalNote,
  id?: string,
  shorten?: boolean,
  width?: number,
  margins?: number,
  footerSize?: 'xwide' | 'wide' | 'normal' | 'compact' | 'short' | 'mini',
}> = (props) => {

  const intl = useIntl();
  const settings = useSettingsContext();

  const [status, setStatus] = createSignal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [showOriginal, setShowOriginal] = createSignal(true);
  const [translation, setTranslation] = createSignal<NoteTranslationResponse>();

  const targetLanguage = () => normalizeTranslationLanguage(settings?.locale);

  const translatedFrom = () => {
    const source = translation()?.detectedSourceLanguage;

    if (!source) return '';

    return intl.formatMessage(t.translatedFrom, {
      language: languageName(source, targetLanguage()),
    });
  };

  const buttonLabel = () => {
    if (status() === 'loading') return intl.formatMessage(t.translating);

    if (translation()) {
      return showOriginal() ?
        intl.formatMessage(t.showTranslation) :
        intl.formatMessage(t.showOriginal);
    }

    return intl.formatMessage(t.translate);
  };

  const onTranslate = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (status() === 'loading') return;

    if (translation()) {
      setShowOriginal(show => !show);
      return;
    }

    try {
      setStatus('loading');

      const response = await translateNote(props.note, targetLanguage());

      setTranslation(() => response);
      setShowOriginal(false);
      setStatus('ready');
    } catch {
      setStatus('error');
      setShowOriginal(true);
    }
  };

  return (
    <div class={styles.translationWrapper}>
      <Show
        when={!showOriginal() && translation()}
        fallback={
          <ParsedNote
            note={props.note}
            id={props.id}
            shorten={props.shorten}
            width={props.width}
            margins={props.margins}
            footerSize={props.footerSize}
          />
        }
      >
        {(translated) => (
          <>
            <ParsedNote
              note={props.note}
              id={`translated_${props.note.noteId}`}
              contentOverride={translated().translatedText}
              shorten={props.shorten}
              width={props.width}
              margins={props.margins}
              footerSize={props.footerSize}
              ignoreMedia={true}
              noPreviews={true}
            />

            <Show when={translatedFrom()}>
              <div class={styles.translationMeta}>
                {translatedFrom()}
              </div>
            </Show>
          </>
        )}
      </Show>

      <Show when={canTranslateNote(props.note)}>
        <div class={styles.translationControls}>
          <button
            type="button"
            class={styles.translateButton}
            onClick={onTranslate}
            disabled={status() === 'loading'}
            aria-busy={status() === 'loading'}
            aria-pressed={!showOriginal()}
          >
            {buttonLabel()}
          </button>

          <Show when={status() === 'error'}>
            <span class={styles.translationError}>
              {intl.formatMessage(t.translationUnavailable)}
            </span>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default NoteTranslation;
