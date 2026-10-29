import { Component, createResource, createSignal, Show } from 'solid-js';
import { useIntl } from '@cookbook/solid-intl';
import { PrimalNote } from '../../types/primal';
import { note as t } from '../../translations';
import {
  baseLanguage,
  detectLanguage,
  hasOnDevice,
  hasRemote,
  hasTranslatableText,
  likelyForeign,
  translateNote,
} from '../../lib/noteTranslation';

import styles from './Note.module.scss';

const languageName = (code: string, uiLocale: string) => {
  try { return new Intl.DisplayNames([uiLocale], { type: 'language' }).of(code) || code; }
  catch { return code; }
};

/**
 * Inline "Translate" control shown under a note only when the note is
 * written in a language other than the reader's. Everything runs on device.
 */
const TranslateNote: Component<{
  note: PrimalNote,
  onTranslated: (content: string | undefined) => void,
}> = (props) => {
  const intl = useIntl();
  const target = () => baseLanguage(navigator.language);

  // On-device browsers detect the language locally. Elsewhere (Safari,
  // Firefox) a cheap script/common-word check decides whether to offer the
  // configured translation service; it reports the real language afterwards.
  const [source] = createResource(
    () => hasTranslatableText(props.note.content) ? props.note.content : false,
    async (content) => {
      const local = hasOnDevice() ? await detectLanguage(content).catch(() => undefined) : undefined;
      if (local) return local;
      return hasRemote() && likelyForeign(content, target()) ? 'auto' : undefined;
    },
  );
  const [detected, setDetected] = createSignal<string>();

  const [state, setState] = createSignal<'original' | 'loading' | 'translated' | 'same' | 'error'>('original');

  const toggle = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (state() === 'translated') {
      setState('original');
      props.onTranslated(undefined);
      return;
    }
    setState('loading');
    try {
      const result = await translateNote(props.note.content, target());
      setDetected(result.source);
      if (result.source === result.target) {
        setState('same');
        return;
      }
      props.onTranslated(result.text);
      setState('translated');
    } catch {
      setState('error');
    }
  };

  return (
    <Show when={source() && source() !== target()}>
      <div class={styles.translateNote}>
        <Show when={state() === 'translated'}>
          <span class={styles.translatedFrom}>
            {intl.formatMessage(t.translatedFrom, { language: languageName(detected() || source()!, intl.locale) })}
            {' · '}
          </span>
        </Show>
        <Show when={state() !== 'same'}><button class={styles.translateButton} onClick={toggle} disabled={state() === 'loading'}>
          {state() === 'translated' ? intl.formatMessage(t.showOriginal)
            : state() === 'loading' ? intl.formatMessage(t.translating)
            : intl.formatMessage(t.translate)}
        </button></Show>
        <Show when={state() === 'same'}>
          <span class={styles.translatedFrom}>{intl.formatMessage(t.alreadyInLanguage)}</span>
        </Show>
        <Show when={state() === 'error'}>
          <span class={styles.translateError}>{intl.formatMessage(t.translateFailed)}</span>
        </Show>
      </div>
    </Show>
  );
};

export default TranslateNote;
