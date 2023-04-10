import { Component, createMemo, Match, Show, Switch } from 'solid-js';
import { PrimalNote } from '../../../types/primal';

import styles from './NoteHeader.module.scss';
import { date } from '../../../lib/dates';
import { trimVerification } from '../../../lib/profile';
import { truncateNpub } from '../../../stores/profile';

const NoteHeader: Component<{ note: PrimalNote}> = (props) => {

  const authorName = () => {
    return props.note.user?.displayName ||
      props.note.user?.name ||
      truncateNpub(props.note.user.npub);
  };

  const verification = createMemo(() => {
    return trimVerification(props.note.user?.nip05);
  });

  return (
    <div class={styles.header}>
      <span class={styles.postInfo}>
        <span class={styles.userInfo}>
          <Show
            when={props.note.user?.nip05}
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
              title={props.note.user?.nip05}
            >
              {verification()[1]}
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
