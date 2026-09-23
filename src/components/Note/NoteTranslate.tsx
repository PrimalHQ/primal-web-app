import { Component, Show, createSignal } from 'solid-js';
import { useIntl } from '@cookbook/solid-intl';
import { hookForDev } from '../../lib/devTools';
import {
  languageDisplayName,
  resolveTargetLanguage,
  translateText,
} from '../../lib/translate';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { actions as tActions } from '../../translations';
import styles from './NoteTranslate.module.scss';

const NoteTranslate: Component<{
  content: string;
  id?: string;
}> = (props) => {
  const intl = useIntl();
  const settings = useSettingsContext();

  const [loading, setLoading] = createSignal(false);
  const [translated, setTranslated] = createSignal<string | undefined>();
  const [sourceLang, setSourceLang] = createSignal<string | undefined>();
  const [error, setError] = createSignal<string | undefined>();
  const [showingTranslation, setShowingTranslation] = createSignal(false);

  const targetLang = () => resolveTargetLanguage(settings?.locale);

  const hasContent = () => (props.content || '').trim().length > 0;

  const onTranslate = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!hasContent() || loading()) return;

    // Toggle back to original if already showing
    if (showingTranslation() && translated()) {
      setShowingTranslation(false);
      return;
    }

    if (translated()) {
      setShowingTranslation(true);
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      const result = await translateText(props.content, targetLang());
      setTranslated(result.translatedText);
      setSourceLang(result.detectedSourceLanguage);
      setShowingTranslation(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const onShowOriginal = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowingTranslation(false);
  };

  return (
    <Show when={hasContent()}>
      <div
        id={props.id}
        class={styles.translate}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <Show
          when={!showingTranslation()}
          fallback={
            <>
              <div class={styles.translated}>{translated()}</div>
              <div class={styles.meta}>
                <Show when={sourceLang()}>
                  <span>
                    {intl.formatMessage(tActions.noteTranslate.translatedFrom, {
                      language: languageDisplayName(sourceLang() || '', targetLang()),
                    })}
                  </span>
                </Show>
                <button type="button" class={styles.action} onClick={onShowOriginal}>
                  {intl.formatMessage(tActions.noteTranslate.showOriginal)}
                </button>
              </div>
            </>
          }
        >
          <button
            type="button"
            class={styles.action}
            onClick={onTranslate}
            disabled={loading()}
          >
            {loading()
              ? intl.formatMessage(tActions.noteTranslate.translating)
              : intl.formatMessage(tActions.noteTranslate.translate)}
          </button>
        </Show>

        <Show when={error()}>
          <div class={styles.error}>
            {intl.formatMessage(tActions.noteTranslate.failed)}: {error()}
          </div>
        </Show>
      </div>
    </Show>
  );
};

export default hookForDev(NoteTranslate);
