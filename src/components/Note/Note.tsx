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
import NoteFooter from './NoteFooter/NoteFooter';
import NoteHeader from './NoteHeader/NoteHeader';

import styles from './Note.module.scss';

const Note: Component<{ note: PrimalNote }> = (props) => {

  const repost = () => props.note.repost;

  return (
    <A class={styles.postLink} href={`/thread/${props.note?.post.noteId}`}>
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
          title={props.note?.user?.npub}
        >
          <A
            href={`/profile/${props.note.user.npub}`}
          >
            <Avatar
              src={props.note?.user?.picture}
              size="md"
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

          <NoteFooter note={props.note} />
        </div>
      </div>
    </A>
  )
}

export default Note;
