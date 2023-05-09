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
import { style } from 'solid-js/web';

const Note: Component<{ note: PrimalNote }> = (props) => {

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
        <div
          class={styles.avatar}
          title={props.note?.user?.npub}
        >
          <A
            href={`/profile/${props.note.user.npub}`}
          >
            <Avatar
              src={props.note?.user?.picture}
              size="md"
              verified={props.note?.user?.nip05}
            />
          </A>
          <div class={styles.avatarName}>{authorName()}</div>
        </div>
        <div class={styles.content}>
          <NoteHeader note={props.note} />

          <div class={styles.message}>
            <ParsedNote note={props.note} />
            <div class={styles.messageFade}></div>
          </div>

          <NoteFooter note={props.note} />
        </div>
      </div>
    </A>
  )
}

export default Note;
