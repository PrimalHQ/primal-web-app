import { A } from '@solidjs/router';
import { Component, Show } from 'solid-js';
import { PrimalNote } from '../../types/primal';
import Avatar from '../Avatar/Avatar';
import ParsedNote from '../ParsedNote/ParsedNote';
import NoteFooter from './NoteFooter/NoteFooter';
import NoteHeader from './NoteHeader/NoteHeader';

import styles from './Note.module.scss';
import { useThreadContext } from '../../contexts/ThreadContext';
import { useIntl } from '@cookbook/solid-intl';
import { truncateNpub } from '../../stores/profile';

const Note: Component<{ note: PrimalNote }> = (props) => {

  const threadContext = useThreadContext();
  const intl = useIntl();

  const repost = () => props.note.repost;

  const navToThread = (note: PrimalNote) => {
    threadContext?.actions.setPrimaryNote(note);
  };

  const reposterName = () => {
    const r = repost();

    if (!r) {
      return '';
    }

    return r.user?.displayName ||
      r.user?.name ||
      truncateNpub(r.user.npub);
  }

  const isVerifiedByPrimal = () => {
    return !!props.note.user.nip05 &&
      props.note.user.nip05.endsWith('primal.net');
  }


  return (
    <A
      class={styles.postLink}
      href={`/thread/${props.note?.post.noteId}`}
      onClick={() => navToThread(props.note)}
      data-event={props.note.post.id}
      data-event-bech32={props.note.post.noteId}
    >
      <Show when={repost()}>
        <div class={styles.repostedBy}>
          <div class={styles.repostIcon}></div>
          <span>
            <A href={`/profile/${repost()?.user.npub}`} >
              {reposterName()}
            </A>
            <span>
              {intl.formatMessage({
                id: 'note.reposted',
                defaultMessage: 'Reposted',
                description: 'Label indicating that the note is a repost',
              })}
            </span>
          </span>
        </div>
      </Show>
      <div class={styles.post}>
        <NoteHeader note={props.note} />
        <div class={styles.content}>
          <div class={styles.message}>
            <ParsedNote note={props.note} />
          </div>
          <NoteFooter note={props.note} />
        </div>
      </div>
    </A>
  )
}

export default Note;
