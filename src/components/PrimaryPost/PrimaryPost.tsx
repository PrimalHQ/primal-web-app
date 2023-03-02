import { A } from '@solidjs/router';
import { Component, createSignal, Match, Switch } from 'solid-js';
import { date } from '../../lib/dates';
import { parseNote } from '../../lib/posts';
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

    return (
      <div class={styles.border}>
        <div class={styles.post}>
          <div class={styles.avatar} title={props.post?.user?.name}>
            <Avatar
              src={props.post?.user?.picture}
              size="xl"
              verified={props.post?.user?.nip05}
            />
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
                <div class={styles.statNumber}>{props.post?.post?.replies}</div>
              </div>
              <div class={styles.stat}>
                <div class={styles.likeIcon}></div>
                <div class={styles.statNumber}>{props.post?.post?.likes}</div>
              </div>
              <div class={styles.stat}>
                <div class={styles.repostIcon}></div>
                <div class={styles.statNumber}>{props.post?.post?.mentions}</div>
              </div>
              <div class={styles.stat}>
                <div class={styles.zapIcon}></div>
                <div class={styles.statNumber}>{props.post?.post?.zaps}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
}

export default PrimaryPost;
