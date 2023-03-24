import { A, Navigate } from '@solidjs/router';
import { useNavigate, useRouter } from '@solidjs/router/dist/routing';
import { Component, Show } from 'solid-js';
import { date } from '../../lib/dates';
import { trimVerification } from '../../lib/profile';
import { PrimalNote } from '../../types/primal';
import Avatar from '../Avatar/Avatar';
import ParsedNote from '../ParsedNote/ParsedNote';

import styles from './EmbeddedNote.module.scss';

const EmbeddedNote: Component<{ note: PrimalNote}> = (props) => {

  const user = () => props.note.user;

  return (
    <A
    href={`/thread/${props.note.post.noteId}`}
    class={styles.mentionedNote}
  >
    <div class={styles.mentionedNoteHeader}>
      <Avatar
        src={props.note.user.picture}
        size="xxs"
      />
      <span class={styles.postInfo}>
        <span class={styles.userInfo}>
          <span class={styles.userName}>
            {props.note.user.name}
          </span>
          <Show when={props.note.user.nip05} >
            <span class={styles.verifiedIcon} />
            <span
              class={styles.verifiedBy}
              title={props.note.user.nip05}
            >
              {trimVerification(props.note.user.nip05)}
            </span>
          </Show>
        </span>

        <span
          class={styles.time}
          title={date(props.note.post.created_at).date.toLocaleString()}
        >
          {date(props.note.post.created_at).label}
        </span>
      </span>
    </div>
    <ParsedNote
      note={props.note}
      ignoreMentionedNotes={true}
    />
  </A>
  )
}

export default EmbeddedNote;
