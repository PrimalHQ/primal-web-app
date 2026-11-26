import { Component, createEffect, createSignal, on, onCleanup, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { useIntl } from '@cookbook/solid-intl';
import { PrimalNote } from '../../types/primal';
import { noteTranslate as t } from '../../translations';
import {
  formatLanguageName,
  shouldOfferTranslation,
} from '../../lib/translationSanitizer';
import {
  translateNoteContent,
  TranslationError,
  TranslationResult,
} from '../../lib/translation';
import {
  refreshTranslationCacheCount,
  translationStore,
} from '../../stores/translationStore';
import { hookForDev } from '../../lib/devTools';

import styles from './NoteTranslate.module.scss';

type TranslateStatus =
  | 'idle'
  | 'loading'
  | 'translated'
  | 'same_language'
  | 'unconfigured'
  | 'error';

const NoteTranslate: Component<{
  note: PrimalNote;
  id?: string;
}> = (props) => {
  const intl = useIntl();

  const [status, setStatus] = createSignal<TranslateStatus>('idle');
  const [result, setResult] = createSignal<TranslationResult | null>(null);
  const [showTranslated, setShowTranslated] = createSignal<boolean>(true);
  const [errorMessage, setErrorMessage] = createSignal<string>('');

  let abortController: AbortController | undefined;

  const cancelPending = () => {
    if (abortController) {
      abortController.abort();
      abortController = undefined;
    }
  };

  onCleanup(() => {
    cancelPending();
  });

  // Reset per-note UI state when note identity or active translation settings change.
  createEffect(
    on(
      () => [
        props.note?.post?.id,
        props.note?.content,
        translationStore.provider,
        translationStore.targetLanguage,
        translationStore.libreTranslateUrl,
        translationStore.libreTranslateApiKey,
        translationStore.googleApiKey,
      ],
      () => {
        cancelPending();
        setStatus('idle');
        setResult(null);
        setShowTranslated(true);
        setErrorMessage('');
      },
      { defer: true },
    ),
  );

  const canTranslate = () => shouldOfferTranslation(props.note.content);

  const stopBubble = (e: MouseEvent) => {
    e.stopPropagation();
  };

  const handleTranslate = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const existing = result();
    if (status() === 'translated' && existing) {
      setShowTranslated((prev) => !prev);
      return;
    }

    if (translationStore.provider === 'none') {
      setStatus('unconfigured');
      return;
    }

    cancelPending();
    abortController = new AbortController();
    const activeController = abortController;

    setStatus('loading');
    setErrorMessage('');

    try {
      const translated = await translateNoteContent(
        props.note.content || '',
        {
          provider: translationStore.provider,
          targetLanguage: translationStore.targetLanguage,
          libreTranslateUrl: translationStore.libreTranslateUrl,
          libreTranslateApiKey: translationStore.libreTranslateApiKey,
          googleApiKey: translationStore.googleApiKey,
        },
        { signal: activeController.signal },
      );

      if (activeController.signal.aborted) return;

      refreshTranslationCacheCount();
      setResult(translated);

      if (translated.alreadyInTargetLanguage) {
        setStatus('same_language');
        return;
      }

      setShowTranslated(true);
      setStatus('translated');
    } catch (err) {
      if (activeController.signal.aborted) {
        setStatus('idle');
        return;
      }

      if (err instanceof TranslationError) {
        if (err.code === 'ABORTED') {
          setStatus('idle');
          return;
        }
        if (
          err.code === 'NOT_CONFIGURED' ||
          err.code === 'INVALID_ENDPOINT' ||
          err.code === 'MISSING_API_KEY'
        ) {
          setErrorMessage(err.message);
          setStatus('unconfigured');
          return;
        }
        setErrorMessage(err.message);
        setStatus('error');
        return;
      }

      setErrorMessage(intl.formatMessage(t.genericError));
      setStatus('error');
    } finally {
      if (abortController === activeController) {
        abortController = undefined;
      }
    }
  };

  const handleCancel = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    cancelPending();
    setStatus('idle');
  };

  const handleDismiss = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setStatus('idle');
    setErrorMessage('');
  };

  const handleToggleOriginal = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowTranslated((prev) => !prev);
  };

  const sourceLanguageLabel = () => {
    const code = result()?.detectedSourceLanguage;
    return code ? formatLanguageName(code, intl.locale) : undefined;
  };

  const targetLanguageLabel = () => {
    const code = result()?.targetLanguage;
    return code ? formatLanguageName(code, intl.locale) : '';
  };

  return (
    <Show when={canTranslate()}>
      <div
        id={props.id}
        class={styles.noteTranslate}
        onClick={stopBubble}
      >
        <Show when={status() === 'idle'}>
          <div class={styles.actionRow}>
            <button
              type="button"
              class={styles.translateButton}
              onClick={handleTranslate}
            >
              <svg
                class={styles.globeIcon}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18" />
                <path d="M12 3a14 14 0 0 1 0 18" />
                <path d="M12 3a14 14 0 0 0 0 18" />
              </svg>
              <span>{intl.formatMessage(t.translatePost)}</span>
            </button>
          </div>
        </Show>

        <Show when={status() === 'loading'}>
          <div class={styles.actionRow}>
            <span class={styles.statusText}>
              {intl.formatMessage(t.translating)}
            </span>
            <button
              type="button"
              class={styles.secondaryButton}
              onClick={handleCancel}
            >
              {intl.formatMessage(t.cancel)}
            </button>
          </div>
        </Show>

        <Show when={status() === 'translated' && result()}>
          <Show
            when={showTranslated()}
            fallback={
              <div class={styles.actionRow}>
                <button
                  type="button"
                  class={styles.translateButton}
                  onClick={handleToggleOriginal}
                >
                  {intl.formatMessage(t.showTranslation)}
                </button>
              </div>
            }
          >
            <div class={styles.translatedCard}>
              <div class={styles.translatedHeader}>
                <span class={styles.translatedMeta}>
                  <Show
                    when={sourceLanguageLabel()}
                    fallback={intl.formatMessage(t.translatedGeneric)}
                  >
                    {(lang) =>
                      intl.formatMessage(t.translatedFrom, { language: lang() })
                    }
                  </Show>
                </span>
                <button
                  type="button"
                  class={styles.translateButton}
                  onClick={handleToggleOriginal}
                >
                  {intl.formatMessage(t.showOriginal)}
                </button>
              </div>
              <div class={styles.translatedBody}>
                {result()?.translatedText}
              </div>
            </div>
          </Show>
        </Show>

        <Show when={status() === 'same_language'}>
          <div class={styles.actionRow}>
            <span class={styles.statusText}>
              {intl.formatMessage(t.alreadyInLanguage, {
                language: targetLanguageLabel(),
              })}
            </span>
            <button
              type="button"
              class={styles.secondaryButton}
              onClick={handleDismiss}
            >
              {intl.formatMessage(t.dismiss)}
            </button>
          </div>
        </Show>

        <Show when={status() === 'unconfigured'}>
          <div class={styles.actionRow}>
            <span class={styles.statusText}>
              {errorMessage() || intl.formatMessage(t.notConfigured)}
            </span>
            <A
              href="/settings/translation"
              class={styles.settingsLink}
              onClick={stopBubble}
            >
              {intl.formatMessage(t.openSettings)}
            </A>
            <button
              type="button"
              class={styles.secondaryButton}
              onClick={handleDismiss}
            >
              {intl.formatMessage(t.dismiss)}
            </button>
          </div>
        </Show>

        <Show when={status() === 'error'}>
          <div class={styles.actionRow}>
            <span class={styles.errorText}>
              {errorMessage() || intl.formatMessage(t.genericError)}
            </span>
            <button
              type="button"
              class={styles.translateButton}
              onClick={handleTranslate}
            >
              {intl.formatMessage(t.retry)}
            </button>
            <A
              href="/settings/translation"
              class={styles.settingsLink}
              onClick={stopBubble}
            >
              {intl.formatMessage(t.openSettings)}
            </A>
          </div>
        </Show>
      </div>
    </Show>
  );
};

export default hookForDev(NoteTranslate);
