import { A } from '@solidjs/router';
import { Component, createSignal, Show } from 'solid-js';
import { PrimalNote } from '../../types/primal';
import ParsedNote from '../ParsedNote/ParsedNote';
import NoteFooter from './NoteFooter/NoteFooter';
import NoteHeader from './NoteHeader/NoteHeader';

import styles from './Note.module.scss';
import { useThreadContext } from '../../contexts/ThreadContext';
import { useIntl } from '@cookbook/solid-intl';
import { authorName, userName } from '../../stores/profile';
import { note as t } from '../../translations';
import { hookForDev } from '../../lib/devTools';
import NoteReplyHeader from './NoteHeader/NoteReplyHeader';
import Avatar from '../Avatar/Avatar';
import NoteAuthorInfo from './NoteAuthorInfo';
import NoteRepostHeader from './NoteRepostHeader';
import PrimalMenu from '../PrimalMenu/PrimalMenu';
import NoteContextMenu from './NoteContextMenu';
import NoteReplyToHeader from './NoteReplyToHeader';

const Note: Component<{ note: PrimalNote, id?: string, parent?: boolean, shorten?: boolean }> = (props) => {

  const threadContext = useThreadContext();
  const intl = useIntl();

  const repost = () => props.note.repost;

  const navToThread = (note: PrimalNote) => {
    threadContext?.actions.setPrimaryNote(note);
  };

  return (
    <A
      id={props.id}
      class={`${styles.note} ${props.parent ? styles.parent : ''}`}
      href={`/e/${props.note?.post.noteId}`}
      onClick={() => navToThread(props.note)}
      data-event={props.note.post.id}
      data-event-bech32={props.note.post.noteId}
      draggable={false}
    >
      <div class={styles.header}>
        <Show when={repost()}>
          <NoteRepostHeader repost={props.note.repost} />
        </Show>
      </div>
      <div class={styles.content}>
        <div class={styles.leftSide}>
          <A href={`/p/${props.note.user.npub}`}>
            <Avatar user={props.note.user} size="vs" />
          </A>
          <Show
            when={props.parent}
          >
            <div class={styles.ancestorLine}></div>
          </Show>
        </div>

        <div class={styles.rightSide}>
          <NoteAuthorInfo
            author={props.note.user}
            time={props.note.post.created_at}
          />

          <NoteReplyToHeader note={props.note} />

          <div class={styles.message}>
            <ParsedNote note={props.note} shorten={props.shorten} />
          </div>

          <NoteFooter note={props.note} />
        </div>
      </div>
    </A>
  )
}

export default hookForDev(Note);
