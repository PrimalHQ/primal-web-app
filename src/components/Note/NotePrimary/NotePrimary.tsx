import { A } from '@solidjs/router';
import { Component, Match, Switch } from 'solid-js';
import { useFeedContext } from '../../../contexts/FeedContext';
import { date } from '../../../lib/dates';
import { sendLike, sendRepost } from '../../../lib/notes';
import { PrimalNote } from '../../../types/primal';
import Avatar from '../../Avatar/Avatar';
import ParsedNote from '../../ParsedNote/ParsedNote';
import NoteFooter from '../NoteFooter/NoteFooter';
import NoteHeader from '../NoteHeader/NoteHeader';

import styles from './NotePrimary.module.scss';


const trimVerification = (address: string) => {
  const [_, domain] = address.split('@');

  return domain;
}

const NotePrimary: Component<{ note: PrimalNote }> = (props) => {

  return (
      <div class={styles.post}>
        <div class={styles.border}></div>
        <div
          class={styles.avatar}
          title={props.note?.user?.name}
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
          <div class={styles.avatarName}>{props.note?.user?.name}</div>
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
