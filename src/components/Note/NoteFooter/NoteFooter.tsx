import { A, Navigate } from '@solidjs/router';
import { useNavigate, useRouter } from '@solidjs/router/dist/routing';
import type { Component } from 'solid-js';
import { PrimalNote } from '../../../types/primal';
import Avatar from '../../Avatar/Avatar';
import { sendLike, likedNotes, sendRepost } from '../../../lib/notes';

import styles from './NoteFooter.module.scss';
import { useFeedContext } from '../../../contexts/FeedContext';

const NoteFooter: Component<{ note: PrimalNote}> = (props) => {

  const context = useFeedContext();

  const liked = () => likedNotes.includes(props.note.post.id);

  const doRepost = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    sendRepost(props.note, context?.relays, context?.actions?.setData);
  };

  const doLike = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    sendLike(props.note, context?.relays, context?.actions?.setData);
  };

  return (
    <div class={styles.footer}>
      <div class={styles.stat}>
        <div class={styles.replyIcon}></div>
        <div class={styles.statNumber}>{props.note.post?.replies || ''}</div>
      </div>
      <button class={styles.stat} onClick={doLike} disabled={liked()}>
        <div class={styles.likeIcon}></div>
        <div class={styles.statNumber}>{props.note.post?.likes || ''}</div>
      </button>
      <button class={styles.stat} onClick={doRepost}>
        <div class={styles.repostIcon}></div>
        <div class={styles.statNumber}>{props.note.post?.reposts || ''}</div>
      </button>
      <div class={styles.stat}>
        <div class={styles.zapIcon}></div>
        <div class={styles.statNumber}>{props.note.post?.satszapped || ''}</div>
      </div>
    </div>
  )
}

export default NoteFooter;
