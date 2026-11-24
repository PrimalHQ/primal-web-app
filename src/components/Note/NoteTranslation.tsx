import { A } from '@solidjs/router';
import { useIntl } from '@cookbook/solid-intl';
import { Component, createEffect, createSignal, on, onCleanup, Show } from 'solid-js';
import {
  formatLanguageName,
  hasTranslatableText,
  loadTranslationPreferences,
  NoteTranslationError,
  translateNoteContent,
  TranslationResult,
} from '../../lib/noteTranslation';
import { noteTranslation as t } from '../../translations';
import { PrimalNote } from '../../types/primal';

import styles from './NoteTranslation.module.scss';

const NoteTranslation: Component<{ note: PrimalNote }> = (props) => {
  const intl = useIntl();

  const [isLoading, setIsLoading] = createSignal(false);
  const [showTranslated, setShowTranslated] = createSignal(false);
  const [result, setResult] = createSignal<TranslationResult | null>(null);
  const [errorCode, setErrorCode] = createSignal<NoteTranslationError['code'] | null>(null);

  let activeController: AbortController | null = null;

  const cancelInFlight = () => {
    if (activeController) {
      activeController.abort();
      activeController = null;
    }
  };

  createEffect(on(() => props.note.post.id, () => {
    cancelInFlight();
    setIsLoading(false);
    setShowTranslated(false);
    setResult(null);
    setErrorCode(null);
  }));

  onCleanup(() => {
    cancelInFlight();
  });

  const canTranslate = () => hasTranslatableText(props.note.content);

  const detectedLanguageLabel = () => {
    const detected = result()?.detectedLanguage;
    return detected ? formatLanguageName(detected, intl.locale) : '';
  };

  const onTranslateClick = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading()) return;

    if (showTranslated()) {
      setShowTranslated(false);
      return;
    }

    if (result()) {
      setShowTranslated(true);
      setErrorCode(null);
      return;
    }

    cancelInFlight();
    const controller = new AbortController();
    activeController = controller;

    setIsLoading(true);
    setErrorCode(null);

    try {
      const prefs = loadTranslationPreferences();
      const translated = await translateNoteContent(props.note.content, prefs, {
        signal: controller.signal,
      });

      if (activeController !== controller) return;

      setResult(translated);
      setShowTranslated(true);
    } catch (err) {
      if (activeController !== controller) return;

      if (err instanceof NoteTranslationError) {
        if (err.code !== 'ABORTED') {
          setErrorCode(err.code);
        }
      } else {
        setErrorCode('NETWORK_ERROR');
      }
    } finally {
      if (activeController === controller) {
        activeController = null;
        setIsLoading(false);
      }
    }
  };

  const stopPropagation = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Show when={canTranslate()}>
      <div class={styles.container} onClick={stopPropagation}>
        <Show
          when={showTranslated() && result()}
          fallback={
            <button
              type="button"
              class={styles.actionButton}
              disabled={isLoading()}
              onClick={onTranslateClick}
            >
              {isLoading()
                ? intl.formatMessage(t.translating)
                : intl.formatMessage(t.translate)}
            </button>
          }
        >
          {(translated) => (
            <div class={styles.translatedBox}>
              <div class={styles.metaRow}>
                <span>
                  <Show
                    when={detectedLanguageLabel()}
                    fallback={intl.formatMessage(t.translatedGeneric)}
                  >
                    {intl.formatMessage(t.translatedFrom, {
                      language: detectedLanguageLabel(),
                    })}
                  </Show>
                </span>
                <button
                  type="button"
                  class={styles.actionButton}
                  onClick={onTranslateClick}
                >
                  {intl.formatMessage(t.showOriginal)}
                </button>
              </div>
              <div class={styles.translatedText}>
                {translated().translatedText}
              </div>
            </div>
          )}
        </Show>

        <Show when={errorCode()}>
          {(code) => (
            <div class={styles.errorRow} role="status">
              <span>
                {code() === 'NOT_CONFIGURED'
                  ? intl.formatMessage(t.notConfigured)
                  : code() === 'INVALID_ENDPOINT'
                    ? intl.formatMessage(t.invalidEndpoint)
                    : intl.formatMessage(t.unavailable)}
              </span>
              <Show when={code() === 'NOT_CONFIGURED' || code() === 'INVALID_ENDPOINT'}>
                <A href="/settings/appearance" class={styles.settingsLink}>
                  {intl.formatMessage(t.configureInSettings)}
                </A>
              </Show>
            </div>
          )}
        </Show>
      </div>
    </Show>
  );
};

export default NoteTranslation;
