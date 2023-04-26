import { A } from '@solidjs/router';
import { Component, createMemo, Show } from 'solid-js';
import { useThreadContext } from '../../contexts/ThreadContext';
import { date } from '../../lib/dates';
import { hexToNpub } from '../../lib/keys';
import { trimVerification } from '../../lib/profile';
import { truncateNpub } from '../../stores/profile';
import { NostrNoteContent, NostrPostStats, PrimalNote, PrimalUser } from '../../types/primal';
import Avatar from '../Avatar/Avatar';
import ParsedNote from '../ParsedNote/ParsedNote';

import styles from './EmbeddedNote.module.scss';

const EmbeddedNote: Component<{ note: { post: NostrNoteContent, user: PrimalUser }}> = (props) => {

  const threadContext = useThreadContext();

  const noteId = () => hexToNpub(props.note.post.id);

  const navToThread = () => {
    threadContext?.actions.setPrimaryNote(props.note);
  };

  const authorName = () => {
    return props.note.user?.displayName ||
      props.note.user?.name ||
      truncateNpub(props.note.user.npub);
  };

  const verification = createMemo(() => {
    return trimVerification(props.note.user?.nip05);
  });

  return (
    <A
    href={`/thread/${noteId()}`}
    class={styles.mentionedNote}
    onClick={() => navToThread()}
    data-event={props.note.post.id}
    data-event-bech32={noteId()}
  >
    <div class={styles.mentionedNoteHeader}>
      <Avatar
        src={props.note.user.picture}
        size="xxs"
      />
      <span class={styles.postInfo}>
        <span class={styles.userInfo}>
          <Show
            when={props.note.user.nip05}
            fallback={
              <span class={styles.userName}>
                {authorName()}
              </span>
            }
          >
            <span class={styles.userName}>
              {verification()[0]}
            </span>
            <span class={styles.verifiedIcon} />
            <span
              class={styles.verifiedBy}
              title={props.note.user.nip05}
            >
              {verification()[1]}
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
