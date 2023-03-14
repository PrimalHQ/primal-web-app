import { A } from '@solidjs/router';
import { Component, createSignal, Match, Switch } from 'solid-js';
import { useFeedContext } from '../../contexts/FeedContext';
import { date } from '../../lib/dates';
import { parseNote, sendLike, sendRepost } from '../../lib/posts';
import { PrimalNote } from '../../types/primal';
import Avatar from '../Avatar/Avatar';
import ParsedNote from '../ParsedNote/ParsedNote';

import styles from './PrimaryPost.module.scss';


const trimVerification = (address: string) => {
  const [_, domain] = address.split('@');

  return domain;
}

const PrimaryPost: Component<{ post: PrimalNote }> = (props) => {

  // const [time] = createSignal(date(props.post?.post.created_at));

  const context = useFeedContext();

  const doRepost = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    sendRepost(props.post, context?.relays, context?.actions?.setData);
  };

  const doLike = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    sendLike(props.post, context?.relays, context?.actions?.setData);
  };

  return (
    <div class={styles.border}>
      <div class={styles.post}>
        <div
          class={styles.avatar}
          title={props.post?.user?.name}
        >
          <A
            href={`/profile/${props.post.user.npub}`}
          >
            <Avatar
              src={props.post?.user?.picture}
              size="xl"
              verified={props.post?.user?.nip05}
            />
          </A>
          <div class={styles.avatarName}>{props.post?.user?.name}</div>
        </div>
        <div class={styles.content}>
          <div class={styles.header}>
            <span class={styles.postInfo}>
              <span class={styles.userInfo}>
                <span class={styles.userName}>
                  {props.post?.user?.name}
                </span>
                <Switch>
                  <Match when={props.post?.user?.nip05}>
                    <span class={styles.verifiedIcon} />
                    <span
                      class={styles.verifiedBy}
                      title={props.post?.user?.nip05}
                    >
                      {trimVerification(props.post?.user?.nip05)}
                    </span>
                  </Match>
                </Switch>
              </span>
              <span
                class={styles.time}
                title={date(props.post?.post?.created_at).date.toLocaleString()}
              >
                {date(props.post?.post?.created_at).label}
              </span>
            </span>
            <div class={styles.contextMenu}>...</div>
          </div>

          <div class={styles.message}>
            <ParsedNote note={props.post} />
          </div>

          <div class={styles.footer}>
            <div class={styles.stat}>
              <div class={styles.replyIcon}></div>
              <div class={styles.statNumber}>{props.post?.post?.replies || ''}</div>
            </div>
            <button class={styles.stat} onClick={doLike} disabled={props.liked}>
              <div class={styles.likeIcon}></div>
              <div class={styles.statNumber}>{props.post?.post?.likes || ''}</div>
            </button>
            <button class={styles.stat} onClick={doRepost}>
              <div class={styles.repostIcon}></div>
              <div class={styles.statNumber}>{props.post?.post?.reposts || ''}</div>
            </button>
            <div class={styles.stat}>
              <div class={styles.zapIcon}></div>
              <div class={styles.statNumber}>{props.post?.post?.satszapped || ''}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrimaryPost;
