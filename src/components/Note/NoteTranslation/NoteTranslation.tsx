import { Component, createSignal, Show } from 'solid-js';
import { useIntl } from '@cookbook/solid-intl';
import { Kind } from '../../../constants';
import { useTranslatorContext } from '../../../contexts/TranslatorContext';
import { hookForDev } from '../../../lib/devTools';
import {
  TRANSLATION_LANGUAGES,
  isTranslatable,
  resolveTargetLanguage,
  translateText,
} from '../../../lib/translate';
import { PrimalNote } from '../../../types/primal';
import { actions as tActions } from '../../../translations';
import ParsedNote from '../../ParsedNote/ParsedNote';

import styles from './NoteTranslation.module.scss';

type TranslationState = 'idle' | 'loading' | 'done' | 'same' | 'error';

const NoteTranslation: Component<{
  note: PrimalNote,
  shorten?: boolean,
  width?: number,
  margins?: number,
  footerSize?: 'short',
  noLightbox?: boolean,
  altEmbeds?: boolean,
}> = (props) => {
  const intl = useIntl();
  const translator = useTranslatorContext();

  const [state, setState] = createSignal<TranslationState>('idle');
  const [translatedText, setTranslatedText] = createSignal('');
  const [detectedLanguage, setDetectedLanguage] = createSignal('');
  const [showTranslated, setShowTranslated] = createSignal(false);

  // Only plain text notes with real words can be translated. Polls,
  // articles and media-only notes are left alone.
  const canTranslate = () => {
    if (props.note?.msg?.kind !== Kind.Text) {
      return false;
    }

    return isTranslatable(props.note.content || '');
  };

  const targetLanguage = () => resolveTargetLanguage(translator?.locale);

  const languageName = (code: string) => {
    return TRANSLATION_LANGUAGES.find((l) => l.code === code)?.name || code;
  };

  const onTranslate = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (state() === 'loading') {
      return;
    }

    setState('loading');

    try {
      const result = await translateText(props.note.content, targetLanguage());

      if (result.detectedLanguage && result.detectedLanguage === targetLanguage()) {
        setDetectedLanguage(result.detectedLanguage);
        setState('same');
        return;
      }

      setTranslatedText(result.text);
      setDetectedLanguage(result.detectedLanguage || '');
      setShowTranslated(true);
      setState('done');
    } catch (err) {
      setState('error');
    }
  };

  const onToggle = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowTranslated(!showTranslated());
  };

  const displayNote = () => {
    if (state() === 'done' && showTranslated()) {
      return { ...props.note, content: translatedText() };
    }

    return props.note;
  };

  return (
    <>
      <ParsedNote
        note={displayNote()}
        shorten={props.shorten}
        width={props.width}
        margins={props.margins}
        footerSize={props.footerSize}
        noLightbox={props.noLightbox}
        altEmbeds={props.altEmbeds}
      />

      <Show when={canTranslate()}>
        <div
          class={styles.translateBar}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Show when={state() === 'idle'}>
            <button
              class={styles.translateButton}
              onClick={onTranslate}
            >
              {intl.formatMessage(tActions.noteTranslation.translate)}
            </button>
          </Show>

          <Show when={state() === 'loading'}>
            <span class={styles.translateStatus}>
              {intl.formatMessage(tActions.noteTranslation.translating)}
            </span>
          </Show>

          <Show when={state() === 'error'}>
            <span class={styles.translateError}>
              {intl.formatMessage(tActions.noteTranslation.failed)}
            </span>
            <button
              class={styles.translateButton}
              onClick={onTranslate}
            >
              {intl.formatMessage(tActions.noteTranslation.retry)}
            </button>
          </Show>

          <Show when={state() === 'same'}>
            <span class={styles.translateStatus}>
              {intl.formatMessage(tActions.noteTranslation.alreadyInLanguage, {
                language: languageName(detectedLanguage()),
              })}
            </span>
          </Show>

          <Show when={state() === 'done'}>
            <Show when={detectedLanguage()}>
              <span class={styles.translateStatus}>
                {intl.formatMessage(tActions.noteTranslation.translatedFrom, {
                  language: languageName(detectedLanguage()),
                })}
              </span>
            </Show>
            <button
              class={styles.translateButton}
              onClick={onToggle}
            >
              {showTranslated() ?
                intl.formatMessage(tActions.noteTranslation.showOriginal) :
                intl.formatMessage(tActions.noteTranslation.showTranslation)}
            </button>
          </Show>
        </div>
      </Show>
    </>
  );
};

export default hookForDev(NoteTranslation);
