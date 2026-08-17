import { Component, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { useIntl } from '@cookbook/solid-intl';
import { hookForDev } from '../../../lib/devTools';
import { PrimalNote } from '../../../types/primal';
import ParsedNote from '../../ParsedNote/ParsedNote';
import NoteFooter from '../NoteFooter/NoteFooter';
import NoteHeader from '../NoteHeader/NoteHeader';
import { fetchTranslation, prefetchTranslation } from '../../../lib/translate';
import { note as t } from '../../../translations';

import styles from './NotePrimary.module.scss';


const NotePrimary: Component<{ note: PrimalNote, id?: string }> = (props) => {

  const intl = useIntl();

  const [translation, setTranslation] = createSignal<string | null>(null);
  const [translating, setTranslating] = createSignal(false);

  const noteContent = () => {
    if (props.note.post.content) return props.note.post.content;
    return '';
  };

  const targetLang = () => navigator.language.split('-')[0] || 'en';

  let cancelPrefetch: (() => void) | undefined;

  onMount(() => {
    cancelPrefetch = prefetchTranslation(
      props.note.post.id,
      noteContent(),
      targetLang(),
    );
  });

  onCleanup(() => {
    cancelPrefetch?.();
  });

  const handleTranslate = async () => {
    if (translation()) {
      setTranslation(null);
      return;
    }

    setTranslating(true);
    const result = await fetchTranslation(noteContent(), targetLang(), props.note.post.id);
    setTranslation(result);
    setTranslating(false);
  };

  return (
    <div
      id={props.id}
      class={styles.post}
      data-event={props.note.post.id}
      data-event-bech32={props.note.post.noteId}
    >
      <div class={styles.border}></div>
      <NoteHeader note={props.note} primary={true} />
      <div class={styles.content}>

        <div class={styles.message}>
          <ParsedNote note={props.note} width={Math.min(574, window.innerWidth)} />
        </div>

        <Show when={translation()}>
          <div class={styles.translated}>
            {translation()}
          </div>
        </Show>

        <Show when={noteContent().length > 0}>
          <button
            class={styles.translateButton}
            onClick={handleTranslate}
            disabled={translating()}
          >
            {translating()
              ? intl.formatMessage(t.translating)
              : translation()
                ? intl.formatMessage(t.showOriginal)
                : intl.formatMessage(t.translate)
            }
          </button>
        </Show>

        <NoteFooter note={props.note} wide={true} />
      </div>
    </div>
  )
}

export default hookForDev(NotePrimary);
