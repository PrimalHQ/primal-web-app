import { Component, createSignal, Show } from 'solid-js';
import { useIntl } from '@cookbook/solid-intl';
import { PrimalNote } from '../../../types/primal';
import { noteTranslate as t } from '../../../translations';
import {
  detectNoteLanguage,
  externalTranslateUrl,
  extractNoteText,
  getTargetLanguage,
  isTranslationSupported,
  translateNoteText,
} from '../../../lib/translate';

import styles from './NoteTranslate.module.scss';


const NoteTranslate: Component<{ note: PrimalNote }> = (props) => {

  const intl = useIntl();

  const [state, setState] = createSignal<'idle' | 'translating' | 'done' | 'error'>('idle');
  const [translated, setTranslated] = createSignal('');
  const [detected, setDetected] = createSignal<string | undefined>(undefined);
  const [showTranslation, setShowTranslation] = createSignal(true);

  const text = () => extractNoteText(props.note);

  const targetLanguage = () => getTargetLanguage();

  const onTranslate = async () => {
    if (state() === 'translating') return;

    if (state() === 'done') {
      setShowTranslation(!showTranslation());
      return;
    }

    setState('translating');

    try {
      const source = (await detectNoteLanguage(text())) || 'auto';

      if (source === targetLanguage()) {
        setTranslated(text());
        setDetected(source);
        setState('done');
        setShowTranslation(true);
        return;
      }

      const result = await translateNoteText(props.note.post.id, text(), source);
      setTranslated(result);
      setDetected(source);
      setState('done');
      setShowTranslation(true);
    } catch (e) {
      setState('error');
    }
  };

  const fallbackLink = (extraClass: string) => (
    <a
      class={extraClass}
      href={externalTranslateUrl(text(), targetLanguage())}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e: MouseEvent) => e.stopPropagation()}
    >
      {intl.formatMessage(t.openExternally)}
    </a>
  );

  return (
    <div
      class={styles.translationSection}
      onClick={(e: MouseEvent) => e.stopPropagation()}
    >
      <Show when={state() !== 'done' || !showTranslation()}>
        <button
          class={styles.translateButton}
          disabled={state() === 'translating'}
          onClick={onTranslate}
        >
          <Show
            when={state() !== 'error'}
            fallback={intl.formatMessage(t.retry)}
          >
            <Show
              when={state() !== 'done'}
              fallback={intl.formatMessage(t.showTranslated)}
            >
              <Show
                when={state() !== 'translating'}
                fallback={intl.formatMessage(t.translating)}
              >
                {intl.formatMessage(t.translate)}
              </Show>
            </Show>
          </Show>
        </button>
        <Show when={!isTranslationSupported()}>
          {fallbackLink(styles.externalLink)}
        </Show>
      </Show>

      <Show when={state() === 'error'}>
        {fallbackLink(styles.externalLink)}
      </Show>

      <Show when={state() === 'done' && showTranslation()}>
        <div class={styles.translatedWrapper}>
          <div class={styles.translatedText}>{translated()}</div>
          <div class={styles.translationMeta}>
            <Show when={detected() && detected() !== targetLanguage()}>
              <span>{intl.formatMessage(t.translatedFrom, { language: detected() })}</span>
              <span>·</span>
            </Show>
            <button
              class={styles.metaButton}
              onClick={() => setShowTranslation(false)}
            >
              {intl.formatMessage(t.showOriginal)}
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default NoteTranslate;
