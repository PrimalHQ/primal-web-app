import { A } from '@solidjs/router';
import { Component, Show } from 'solid-js';
import { PrimalNote } from '../../../types/primal';
import ParsedNote from '../../ParsedNote/ParsedNote';
import NoteFooter from '../NoteFooter/NoteFooter';

import styles from './NotificationNote.module.scss';
import { useThreadContext } from '../../../contexts/ThreadContext';

const Note: Component<{ note: PrimalNote, showFooter?: boolean }> = (props) => {

  const threadContext = useThreadContext();

  const navToThread = (note: PrimalNote) => {
    threadContext?.actions.setPrimaryNote(note);
  };

  return (
    <A
      class={styles.postLink}
      href={`/thread/${props.note?.post.noteId}`}
      onClick={() => navToThread(props.note)}
      data-event={props.note.post.id}
      data-event-bech32={props.note.post.noteId}
    >
      <div class={styles.post}>
        <div class={styles.content}>
          <div class={styles.message}>
            <ParsedNote note={props.note} />
          </div>

          <Show when={props.showFooter}>
            <div class={styles.footer}>
              <NoteFooter note={props.note} />
            </div>
          </Show>
        </div>
      </div>
    </A>
  )
}

export default Note;
