import { A, Navigate } from '@solidjs/router';
import { useNavigate, useRouter } from '@solidjs/router/dist/routing';
import { Component, Match, Switch } from 'solid-js';
import { PrimalNote } from '../../types/primal';
import Avatar from '../Avatar/Avatar';
import { sendLike, likedNotes, sendRepost } from '../../lib/posts';

import styles from './PostHeader.module.scss';
import { useFeedContext } from '../../contexts/FeedContext';
import { date } from '../../lib/dates';
import { trimVerification } from '../../lib/profile';

const PostHeader: Component<{ note: PrimalNote}> = (props) => {

  return (
    <div class={styles.header}>
      <span class={styles.postInfo}>
        <span class={styles.userInfo}>
          <span class={styles.userName}>
            {props.note.user?.name}
          </span>
          <Switch>
            <Match when={props.note.user?.nip05}>
              <span class={styles.verifiedIcon} />
              <span
                class={styles.verifiedBy}
                title={props.note.user?.nip05}
              >
                {trimVerification(props.note.user?.nip05)}
              </span>
            </Match>
          </Switch>
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

export default PostHeader;
