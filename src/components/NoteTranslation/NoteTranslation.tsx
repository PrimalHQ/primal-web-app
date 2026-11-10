import { useIntl } from '@cookbook/solid-intl';
import { Component, createMemo, createSignal, Match, Show, Switch } from 'solid-js';
import { hookForDev } from '../../lib/devTools';
import { logError } from '../../lib/logger';
import {
  baseLanguage,
  hasTranslatableContent,
  isTranslationAvailable,
  languageName,
  resolveTargetLanguage,
  translateNoteContent,
  TranslationResult,
} from '../../lib/noteTranslation';
import { translationStore } from '../../stores/translationStore';
import { note as t } from '../../translations';
import { PrimalNote } from '../../types/primal';

import styles from './NoteTranslation.module.scss';

export type NoteTranslationStatus = 'idle' | 'loading' | 'translated' | 'original' | 'same' | 'error';

export type NoteTranslationState = {
  // The note to render, either the original or a copy with translated content
  displayNote: () => PrimalNote,
  isAvailable: () => boolean,
  status: () => NoteTranslationStatus,
  detectedLanguage: () => string,
  toggle: () => void,
};

export const createNoteTranslation = (note: () => PrimalNote): NoteTranslationState => {
  const [status, setStatus] = createSignal<NoteTranslationStatus>('idle');
  const [result, setResult] = createSignal<TranslationResult>();

  const isAvailable = createMemo(() =>
    isTranslationAvailable(translationStore) && hasTranslatableContent(note()?.content)
  );

  const translatedNote = createMemo(() => {
    const res = result();

    return res ? { ...note(), content: res.text } : undefined;
  });

  const displayNote = () => {
    return (status() === 'translated' && translatedNote()) || note();
  };

  const translate = async () => {
    const content = note().content;

    setStatus('loading');

    try {
      const res = await translateNoteContent(content, { ...translationStore });

      // The note was swapped while the request was in flight
      if (note().content !== content) {
        setStatus('idle');
        return;
      }

      const isSame = res.text.trim() === content.trim() ||
        (res.detectedLanguage.length > 0 && res.detectedLanguage === baseLanguage(res.targetLanguage));

      setResult(res);
      setStatus(isSame ? 'same' : 'translated');
    } catch (e) {
      logError('Failed to translate note: ', e);
      setStatus('error');
    }
  };

  const toggle = () => {
    switch (status()) {
      case 'loading':
      case 'same':
        return;
      case 'translated':
        setStatus('original');
        return;
      case 'original': {
        // Settings may have changed since this note was translated
        if (result()?.targetLanguage === resolveTargetLanguage(translationStore)) {
          setStatus('translated');
          return;
        }

        translate();
        return;
      }
      default:
        translate();
    }
  };

  return {
    displayNote,
    isAvailable,
    status,
    detectedLanguage: () => result()?.detectedLanguage || '',
    toggle,
  };
};

const NoteTranslation: Component<{
  translation: NoteTranslationState,
  id?: string,
}> = (props) => {
  const intl = useIntl();

  const onToggle = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    props.translation.toggle();
  };

  const sourceLanguage = () => languageName(props.translation.detectedLanguage());

  const targetLanguage = () => languageName(resolveTargetLanguage(translationStore));

  return (
    <Show when={props.translation.isAvailable()}>
      <div id={props.id} class={styles.noteTranslation} aria-live="polite">
        <Switch>
          <Match when={props.translation.status() === 'idle'}>
            <button class={styles.action} onClick={onToggle}>
              {intl.formatMessage(t.translation.translate)}
            </button>
          </Match>

          <Match when={props.translation.status() === 'loading'}>
            <span class={styles.label}>
              {intl.formatMessage(t.translation.translating)}
            </span>
          </Match>

          <Match when={props.translation.status() === 'translated'}>
            <span class={styles.label}>
              <Show
                when={sourceLanguage()}
                fallback={intl.formatMessage(t.translation.translated)}
              >
                {intl.formatMessage(t.translation.translatedFrom, { language: sourceLanguage() })}
              </Show>
            </span>
            <span class={styles.separator}>·</span>
            <button class={styles.action} onClick={onToggle}>
              {intl.formatMessage(t.translation.showOriginal)}
            </button>
          </Match>

          <Match when={props.translation.status() === 'original'}>
            <button class={styles.action} onClick={onToggle}>
              {intl.formatMessage(t.translation.showTranslation)}
            </button>
          </Match>

          <Match when={props.translation.status() === 'same'}>
            <span class={styles.label}>
              {intl.formatMessage(t.translation.alreadyInLanguage, { language: targetLanguage() })}
            </span>
          </Match>

          <Match when={props.translation.status() === 'error'}>
            <span class={styles.error}>
              {intl.formatMessage(t.translation.failed)}
            </span>
            <span class={styles.separator}>·</span>
            <button class={styles.action} onClick={onToggle}>
              {intl.formatMessage(t.translation.retry)}
            </button>
          </Match>
        </Switch>
      </div>
    </Show>
  );
};

export default hookForDev(NoteTranslation);
