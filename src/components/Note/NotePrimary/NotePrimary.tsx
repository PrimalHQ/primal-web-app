import { A } from '@solidjs/router';
import { Component } from 'solid-js';
import { truncateNpub } from '../../../stores/profile';
import { PrimalNote } from '../../../types/primal';
import Avatar from '../../Avatar/Avatar';
import ParsedNote from '../../ParsedNote/ParsedNote';
import NoteFooter from '../NoteFooter/NoteFooter';
import NoteHeader from '../NoteHeader/NoteHeader';

import styles from './NotePrimary.module.scss';


const NotePrimary: Component<{ note: PrimalNote }> = (props) => {


  const authorName = () => {
    return props.note.user?.displayName ||
      props.note.user?.name ||
      truncateNpub(props.note.user.npub);
  }

  return (
      <div
        class={styles.post}
        data-event={props.note.post.id}
        data-event-bech32={props.note.post.noteId}
      >
        <div class={styles.border}></div>
        <div
          class={styles.avatar}
          title={authorName()}
        >
          <A
            href={`/profile/${props.note.user.npub}`}
          >
            <Avatar
              src={props.note?.user?.picture}
              size="xl"
              verified={props.note?.user?.nip05}
            />
          </A>
          <div class={styles.avatarName}>{authorName()}</div>
        </div>
        <div class={styles.content}>
          <NoteHeader note={props.note} />

          <div class={styles.message}>
            <ParsedNote note={props.note} />
          </div>

          <NoteFooter note={props.note}/>
        </div>
      </div>
  )
}

export default NotePrimary;
