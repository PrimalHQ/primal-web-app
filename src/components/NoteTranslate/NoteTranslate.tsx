import { Component, ComponentProps, createMemo, createSignal, Match, onCleanup, Show, Switch } from 'solid-js';
import { useIntl } from '@cookbook/solid-intl';
import { A } from '@solidjs/router';

import ParsedNote from '../ParsedNote/ParsedNote';
import { PrimalNote } from '../../types/primal';
import { noteTranslation as t } from '../../translations';
import {
  resolveTargetLanguage,
  translateNoteContent,
  translationSettings,
  TranslationError,
} from '../../lib/translation';
import { shouldOfferTranslation } from '../../lib/translationSanitizer';
import { detectLanguage, primaryLanguageCode } from '../../lib/languageDetect';

import styles from './NoteTranslate.module.scss';

type ParsedNoteProps = ComponentProps<typeof ParsedNote>;

type TranslateStatus = 'idle' | 'loading' | 'done' | 'error' | 'same_language';

/**
 * Drop-in replacement for `ParsedNote` that adds inline note translation
 * (issue #133): a "Translate" action below the note content which swaps the
 * rendered content for its translation, in place, with a "Show original"
 * toggle — the same interaction pattern as X/Twitter.
 *
 * Translation happens only on explicit user action. If the note is almost
 * certainly already in the user's language, the action is not offered.
 */
const NoteTranslate: Component<ParsedNoteProps> = (props) => {
  const intl = useIntl();

  const [status, setStatus] = createSignal<TranslateStatus>('idle');
  const [translated, setTranslated] = createSignal('');
  const [detected, setDetected] = createSignal<string | undefined>(undefined);
  const [showing, setShowing] = createSignal(false);
  const [errorCode, setErrorCode] = createSignal<string>('failed');

  let abortController: AbortController | undefined;

  onCleanup(() => abortController?.abort());

  const targetLanguage = createMemo(() => resolveTargetLanguage(translationSettings));

  const offerTranslation = createMemo(() => {
    if (!translationSettings.enabled) return false;
    if (!shouldOfferTranslation(props.note.content)) return false;

    // Pragmatic gate: hide the action when the note is very likely already
    // in the user's language. Inconclusive detection keeps the action.
    const guess = detectLanguage(props.note.content);
    if (guess && guess === targetLanguage()) return false;

    return true;
  });

  const displayNote = (): PrimalNote => {
    if (showing() && translated()) {
      return { ...props.note, content: translated() };
    }
    return props.note;
  };

  const errorMessage = () => {
    switch (errorCode()) {
      case 'not_configured': return intl.formatMessage(t.errors.notConfigured);
      case 'disabled': return intl.formatMessage(t.errors.disabled);
      case 'unreachable': return intl.formatMessage(t.errors.unreachable);
      default: return intl.formatMessage(t.errors.failed);
    }
  };

  const detectedLanguageName = () => {
    const code = detected();
    if (!code) return undefined;
    try {
      return new Intl.DisplayNames([intl.locale], { type: 'language' }).of(code) || code;
    } catch {
      return code;
    }
  };

  const doTranslate = async (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (status() === 'loading') return;

    // Already translated once: just toggle back to the translation.
    if (translated()) {
      setShowing(true);
      setStatus('done');
      return;
    }

    abortController?.abort();
    abortController = new AbortController();
    setStatus('loading');

    try {
      const result = await translateNoteContent(props.note.content, {
        signal: abortController.signal,
      });

      if (result.detectedLanguage &&
          primaryLanguageCode(result.detectedLanguage) === targetLanguage()) {
        setDetected(result.detectedLanguage);
        setStatus('same_language');
        return;
      }

      setTranslated(result.text);
      setDetected(result.detectedLanguage);
      setShowing(true);
      setStatus('done');
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        setStatus('idle');
        return;
      }
      setErrorCode(err instanceof TranslationError ? err.code : 'failed');
      setStatus('error');
    }
  };

  const cancel = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    abortController?.abort();
    setStatus('idle');
  };

  const toggleOriginal = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowing(false);
  };

  const stop = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <>
      <ParsedNote {...props} note={displayNote()} />

      <Show when={offerTranslation()}>
        <div class={styles.translateBar} onClick={stop}>
          <Switch>
            <Match when={status() === 'idle'}>
              <button class={styles.translateAction} onClick={doTranslate}>
                {intl.formatMessage(t.translate)}
              </button>
            </Match>

            <Match when={status() === 'loading'}>
              <span class={styles.translateStatus}>
                {intl.formatMessage(t.translating)}
              </span>
              <button class={styles.translateAction} onClick={cancel}>
                {intl.formatMessage(t.cancel)}
              </button>
            </Match>

            <Match when={status() === 'done' && showing()}>
              <button class={styles.translateAction} onClick={toggleOriginal}>
                {intl.formatMessage(t.showOriginal)}
              </button>
              <Show when={detectedLanguageName()}>
                <span class={styles.translateStatus}>
                  {intl.formatMessage(t.translatedFrom, { language: detectedLanguageName() })}
                </span>
              </Show>
            </Match>

            <Match when={status() === 'done' && !showing()}>
              <button class={styles.translateAction} onClick={doTranslate}>
                {intl.formatMessage(t.showTranslation)}
              </button>
            </Match>

            <Match when={status() === 'same_language'}>
              <span class={styles.translateStatus}>
                {intl.formatMessage(t.alreadyInLanguage)}
              </span>
            </Match>

            <Match when={status() === 'error'}>
              <span class={`${styles.translateStatus} ${styles.translateError}`}>
                {errorMessage()}
              </span>
              <Show when={errorCode() === 'not_configured' || errorCode() === 'disabled'}>
                <A class={styles.translateAction} href="/settings/translation">
                  Settings
                </A>
              </Show>
              <Show when={errorCode() === 'unreachable' || errorCode() === 'provider_error' || errorCode() === 'failed'}>
                <button class={styles.translateAction} onClick={doTranslate}>
                  {intl.formatMessage(t.retry)}
                </button>
              </Show>
            </Match>
          </Switch>
        </div>
      </Show>
    </>
  );
};

export default NoteTranslate;
