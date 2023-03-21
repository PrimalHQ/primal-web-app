import { Component, Match, Show, Switch } from 'solid-js';
import { PrimalNote } from '../../../types/primal';

import styles from './NoteHeader.module.scss';
import { date } from '../../../lib/dates';
import { trimVerification } from '../../../lib/profile';

const NoteHeader: Component<{ note: PrimalNote}> = (props) => {

  return (
    <div class={styles.header}>
      <span class={styles.postInfo}>
        <span class={styles.userInfo}>
          <span class={styles.userName}>
            {props.note.user?.name}
          </span>
          <Show when={props.note.user?.nip05}>
            <span class={styles.verifiedIcon} />
            <span
              class={styles.verifiedBy}
              title={props.note.user?.nip05}
            >
              {trimVerification(props.note.user?.nip05)}
            </span>
          </Show>
        </span>
        <span
          class={styles.time}
          title={date(props.note.post?.created_at).date.toLocaleString()}
        >
          {date(props.note.post?.created_at).label}
        </span>
      </span>
      <div class={styles.contextMenu}>
        <div class={styles.contextIcon}></div>
      </div>
    </div>
  )
}

export default NoteHeader;
