import { Component, Show } from 'solid-js';
import { useTranslationContext } from '../../contexts/TranslationContext';
import { getLanguageName } from '../../services/TranslationService';
import styles from './NoteTranslation.module.scss';

interface NoteTranslationProps {
  noteId: string;
}

const NoteTranslation: Component<NoteTranslationProps> = (props) => {
  const translation = useTranslationContext();

  const translationData = () => translation?.actions.getTranslation(props.noteId);
  const isLoading = () => translationData()?.isLoading;
  const hasTranslation = () => translation?.actions.hasTranslation(props.noteId);
  const translatedText = () => translationData()?.translatedText || '';
  const detectedLanguage = () => translationData()?.detectedLanguage;
  const error = () => translationData()?.error;
  const targetLanguage = () => translation?.targetLanguage || 'en';

  return (
    <Show when={translationData()}>
      <div class={styles.translationContainer}>
        <Show when={isLoading()}>
          <div class={styles.loading}>
            <span class={styles.spinner}></span>
            Translating...
          </div>
        </Show>

        <Show when={error()}>
          <div class={styles.error}>
            Translation failed: {error()}
          </div>
        </Show>

        <Show when={hasTranslation()}>
          <div class={styles.translationHeader}>
            <span class={styles.translationLabel}>
              <Show 
                when={detectedLanguage()}
                fallback={`Translated to ${getLanguageName(targetLanguage())}`}
              >
                Translated from {getLanguageName(detectedLanguage()!)} to {getLanguageName(targetLanguage())}
              </Show>
            </span>
            <button 
              class={styles.hideButton}
              onClick={() => translation?.actions.clearTranslation(props.noteId)}
            >
              Hide
            </button>
          </div>
          <div class={styles.translatedText}>
            {translatedText()}
          </div>
        </Show>
      </div>
    </Show>
  );
};

export default NoteTranslation;
