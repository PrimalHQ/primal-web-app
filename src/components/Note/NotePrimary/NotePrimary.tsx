import { Component, createSignal, Show } from 'solid-js';
import { hookForDev } from '../../../lib/devTools';
import { translateText } from '../../../lib/translate';
import { PrimalNote } from '../../../types/primal';
import { getLang } from '../../../utils';
import ParsedNote from '../../ParsedNote/ParsedNote';
import NoteFooter from '../NoteFooter/NoteFooter';
import NoteHeader from '../NoteHeader/NoteHeader';

import styles from './NotePrimary.module.scss';

const NotePrimary: Component<{ note: PrimalNote, id?: string }> = (props) => {
  const [translated, setTranslated] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  const onTranslate = async () => {
    if (translated()) {
      setTranslated('');
      return;
    }
    setLoading(true);
    try {
      setTranslated(await translateText(props.note.post.content, getLang()));
    } catch (e) {
      console.error('Translation failed', e);
    }
    setLoading(false);
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
          <Show
            when={translated()}
            fallback={<ParsedNote note={props.note} width={Math.min(574, window.innerWidth)} />}
          >
            <div style="white-space: pre-wrap">{translated()}</div>
          </Show>
          <a
            href="#"
            style="font-size: 14px; display: block; margin-top: 8px;"
            onClick={(e) => { e.preventDefault(); onTranslate(); }}
          >
            {loading() ? 'Translating...' : translated() ? 'Show original' : 'Translate post'}
          </a>
        </div>

        <NoteFooter note={props.note} wide={true} />
      </div>
    </div>
  )
}

export default hookForDev(NotePrimary);
