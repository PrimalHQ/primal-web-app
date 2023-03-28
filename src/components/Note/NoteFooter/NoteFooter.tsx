import { Component, createSignal } from 'solid-js';
import { PrimalNote } from '../../../types/primal';
import { sendRepost } from '../../../lib/notes';

import styles from './NoteFooter.module.scss';
import { useAccountContext } from '../../../contexts/AccountContext';
import { useToastContext } from '../../Toaster/Toaster';

const NoteFooter: Component<{ note: PrimalNote}> = (props) => {

  const account = useAccountContext();
  const toast = useToastContext();

  const liked = () => account?.likes.includes(props.note.post.id);

  const [likes, setLikes] = createSignal(props.note.post.likes);
  const [reposts, setReposts] = createSignal(props.note.post.reposts);

  const doRepost = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!account) {
      return;
    }

    const success = await sendRepost(props.note, account.relays);

    if (success) {
      setReposts(reposts() + 1);
      toast?.sendSuccess('Reposted successfully');
    }
  };

  const doLike = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!account) {
      return;
    }

    const success = await account.actions.addLike(props.note);

    if (success) {
      setLikes(likes() + 1);
    }
  };

  const doZap = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    toast?.notImplemented();
  }

  return (
    <div class={styles.footer}>
      <div class={styles.stat}>
        <div class={styles.replyIcon}></div>
        <div class={styles.statNumber}>{props.note.post?.replies || ''}</div>
      </div>
      <button class={styles.stat} onClick={doLike} disabled={liked()}>
        <div class={styles.likeIcon}></div>
        <div class={styles.statNumber}>{likes() || ''}</div>
      </button>
      <button class={styles.stat} onClick={doRepost}>
        <div class={styles.repostIcon}></div>
        <div class={styles.statNumber}>{reposts() || ''}</div>
      </button>
      <button class={styles.stat} onClick={doZap}>
        <div class={styles.zapIcon}></div>
        <div class={styles.statNumber}>{props.note.post?.satszapped || ''}</div>
      </button>
    </div>
  )
}

export default NoteFooter;
