import { A } from '@solidjs/router';
import { Component, Show } from 'solid-js';
import { PrimalNote } from '../../../types/primal';
import ParsedNote from '../../ParsedNote/ParsedNote';
import NoteFooter from '../NoteFooter/NoteFooter';
import NoteHeader from '../NoteHeader/NoteHeader';

import styles from './NotificationNote.module.scss';
import { useThreadContext } from '../../../contexts/ThreadContext';
import { useIntl } from '@cookbook/solid-intl';
import { truncateNpub } from '../../../stores/profile';

const Note: Component<{ note: PrimalNote, showFooter?: boolean }> = (props) => {

  const threadContext = useThreadContext();
  const intl = useIntl();

  const repost = () => props.note.repost;

  const navToThread = (note: PrimalNote) => {
    threadContext?.actions.setPrimaryNote(note);
  };

  const authorName = () => {
    return props.note.user?.displayName ||
      props.note.user?.name ||
      truncateNpub(props.note.user.npub);
  }

  const reposterName = () => {
    const r = repost();

    if (!r) {
      return '';
    }

    return r.user?.displayName ||
      r.user?.name ||
      truncateNpub(r.user.npub);
  }


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
