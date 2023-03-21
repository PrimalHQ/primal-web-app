import { A } from '@solidjs/router';
import { Component, createEffect, createSignal, from, Match, on, onCleanup, onError, onMount, Show, Switch } from 'solid-js';
import { createStore } from 'solid-js/store';
import { useFeedContext } from '../../contexts/FeedContext';
import { date } from '../../lib/dates';
import { hexToNpub } from '../../lib/keys';
import { parseNote, sendLike, sendRepost } from '../../lib/posts';
import { getUserProfile, trimVerification } from '../../lib/profile';
import { isConnected, socket } from '../../sockets';
import { NostrEOSE, NostrEvent, NostrUserContent, PrimalNote } from '../../types/primal';
import Avatar from '../Avatar/Avatar';
import ParsedNote from '../ParsedNote/ParsedNote';
import PostFooter from '../PostFooter/PostFooter';
import PostHeader from '../PostHeader/PostHeader';

import styles from './Post.module.scss';

const Post: Component<{ post: PrimalNote }> = (props) => {

  const context = useFeedContext();

  const repost = () => props.post.repost;

  return (
    <A class={styles.postLink} href={`/thread/${props.post?.post.noteId}`}>
      <Show when={repost()}>
        <div class={styles.repostedBy}>
          <div class={styles.repostIcon}></div>
          <span>
            <A href={`/profile/${repost().user.npub}`} >
              {repost().user.name}
            </A>
            reposted
          </span>
        </div>
      </Show>
      <div class={styles.post}>
        <div
          class={styles.avatar}
          title={props.post?.user?.npub}
        >
          <A
            href={`/profile/${props.post.user.npub}`}
          >
            <Avatar
              src={props.post?.user?.picture}
              size="md"
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
    </A>
  )
}

export default Post;
