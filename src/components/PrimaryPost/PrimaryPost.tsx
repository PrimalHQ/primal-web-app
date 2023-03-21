import { A } from '@solidjs/router';
import { Component, Match, Switch } from 'solid-js';
import { useFeedContext } from '../../contexts/FeedContext';
import { date } from '../../lib/dates';
import { sendLike, sendRepost } from '../../lib/posts';
import { PrimalNote } from '../../types/primal';
import Avatar from '../Avatar/Avatar';
import ParsedNote from '../ParsedNote/ParsedNote';
import PostFooter from '../PostFooter/PostFooter';
import PostHeader from '../PostHeader/PostHeader';

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
          <PostHeader note={props.post} />

          <div class={styles.message}>
            <ParsedNote note={props.post} />
          </div>

          <PostFooter note={props.post} />
        </div>
      </div>
    </div>
  )
}

export default PrimaryPost;
