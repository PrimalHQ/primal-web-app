import { Component, JSXElement, Show } from 'solid-js';
import Avatar from '../Avatar/Avatar';

import styles from './SmallNote.module.scss';
import { A } from '@solidjs/router';
import { PrimalNote } from '../../types/primal';
import { useThreadContext } from '../../contexts/ThreadContext';
import { date } from '../../lib/dates';
import { truncateNpub } from '../../stores/profile';
import ParsedNote from '../ParsedNote/ParsedNote';

const SmallNote: Component<{ note: PrimalNote, children?: JSXElement }> = (props) => {

  const threadContext = useThreadContext();

  const navToThread = (note: PrimalNote) => {
    threadContext?.actions.setPrimaryNote(note);
  };

  const authorName = () => {
    return props.note.user?.displayName ||
      props.note.user?.name ||
      truncateNpub(props.note.user.npub);
  }

  return (
    <div>
      <div class={styles.smallNote}>
        <A href={`/profile/${props.note.user.npub}`} class={styles.avatar}>
          <Avatar src={props.note.user?.picture} size="xxs" />
        </A>
        <A
          href={`/thread/${props.note.post.noteId}`}
          class={styles.content}
          onClick={() => navToThread(props.note)}
        >
          <div class={styles.header}>
            <div class={styles.name} title={authorName()}>
              {authorName()}
            </div>
            <div class={styles.time}>
              <Show
                when={props.children}
                fallback={date(props.note.post?.created_at).label}
              >
                {props.children}
              </Show>
            </div>
          </div>
          <div class={styles.message}>{<ParsedNote note={props.note} />}</div>
        </A>
      </div>
    </div>
  );
}

export default SmallNote;
