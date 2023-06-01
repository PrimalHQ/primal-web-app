import { Component, createEffect, createSignal, onMount, Show } from 'solid-js';
import { PrimalNote } from '../../../types/primal';
import { sendRepost } from '../../../lib/notes';

import styles from './NoteFooter.module.scss';
import { useAccountContext } from '../../../contexts/AccountContext';
import { useToastContext } from '../../Toaster/Toaster';
import { useIntl } from '@cookbook/solid-intl';

import likeFilled from '../../../assets/icons/feed_like_fill.svg';
import likeEmpty from '../../../assets/icons/feed_like.svg';
import replyFilled from '../../../assets/icons/feed_reply_fill.svg';
import replyEmpty from '../../../assets/icons/feed_reply.svg';
import zapFilled from '../../../assets/icons/feed_zap_fill.svg';
import zapEmpty from '../../../assets/icons/feed_zap.svg';
import repostFilled from '../../../assets/icons/feed_repost_fill.svg';
import repostEmpty from '../../../assets/icons/feed_repost.svg';
import { truncateNumber } from '../../../lib/notifications';
import { canUserReceiveZaps, zapNote } from '../../../lib/zap';
import CustomZap from '../../CustomZap/CustomZap';

const NoteFooter: Component<{ note: PrimalNote}> = (props) => {

  const account = useAccountContext();
  const toast = useToastContext();
  const intl = useIntl();

  const [liked, setLiked] = createSignal(props.note.post.noteActions.liked);
  const [zapped, setZapped] = createSignal(props.note.post.noteActions.zapped);
  const [replied, setReplied] = createSignal(props.note.post.noteActions.replied);
  const [reposted, setReposted] = createSignal(props.note.post.noteActions.reposted);

  const [likes, setLikes] = createSignal(props.note.post.likes);
  const [reposts, setReposts] = createSignal(props.note.post.reposts);
  const [replies, setReplies] = createSignal(props.note.post.replies);
  const [zaps, setZaps] = createSignal(props.note.post.satszapped);

  const doRepost = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!account) {
      return;
    }

    const success = await sendRepost(props.note, account.relays);

    if (success) {
      setReposts(reposts() + 1);
      setReposted(true);
      toast?.sendSuccess(
        intl.formatMessage({
          id: 'toast.repostSuccess',
          defaultMessage: 'Reposted successfully',
          description: 'Toast message indicating successfull repost',
        }),
      );
    }
    else {
      toast?.sendWarning(
        intl.formatMessage({
          id: 'toast.repostFailed',
          defaultMessage: 'Failed to repost',
          description: 'Toast message indicating failed repost',
        }),
      );
    }
  };

  const doReply = () => {};

  const doLike = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!account) {
      return;
    }

    const success = await account.actions.addLike(props.note);

    if (success) {
      setLikes(likes() + 1);
      setLiked(true);
    }
  };

  let quickZapDelay = 0;
  const [isCustomZap, setIsCustomZap] = createSignal(false);
  const [isZapping, setIsZapping] = createSignal(false);

  const startZap = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!account?.hasPublicKey()) {
      toast?.sendWarning(
        intl.formatMessage({
          id: 'toast.zapAsGuest',
          defaultMessage: 'You must be logged-in to perform a zap',
          description: 'Toast message indicating user must be logged-in to perform a zap',
        }),
      );
      setIsZapping(false);
      return;
    }

    if (!canUserReceiveZaps(props.note.user)) {
      toast?.sendWarning(
        intl.formatMessage({
          id: 'toast.zapUnavailable',
          defaultMessage: 'Author of this post cannot be zapped',
          description: 'Toast message indicating user cannot receieve a zap',
        }),
      );
      setIsZapping(false);
      return;
    }

    quickZapDelay = setTimeout(() => {
      setIsCustomZap(true);
      setIsZapping(true);
    }, 500);
  };

  const commitZap = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    clearTimeout(quickZapDelay);

    setIsZapping(true);

    if (!isCustomZap()) {
      doQuickZap();
    }
  };

  const doQuickZap = async () => {

    if (account?.hasPublicKey()) {
      const success = await zapNote(props.note, account.publicKey, 1, '', account.relays);
      setIsZapping(false);

      if (success) {
        toast?.sendSuccess(
          intl.formatMessage({
            id: 'toast.zapSuccess',
            defaultMessage: 'Zapped successfully',
            description: 'Toast message indicating successfull zap',
          }),
        );
        setZapped(true);
        return;
      }

      toast?.sendWarning(
        intl.formatMessage({
          id: 'toast.zapFail',
          defaultMessage: 'We were unable to send this Zap',
          description: 'Toast message indicating failed zap',
        }),
      );
    }
  }

  const buttonTypeClasses: Record<string, string> = {
    zap: styles.zapType,
    like: styles.likeType,
    reply: styles.replyType,
    repost: styles.repostType,
  };

  const actionButton = (opts: {
    type: 'zap' | 'like' | 'reply' | 'repost',
    disabled?: boolean,
    highlighted?: boolean,
    onClick?: (e: MouseEvent) => void,
    onMouseDown?: (e: MouseEvent) => void,
    onMouseUp?: (e: MouseEvent) => void,
    onTouchStart?: (e: TouchEvent) => void,
    onTouchEnd?: (e: TouchEvent) => void,
    icon: string,
    iconDisabled: string,
    label: string | number,
  }) => {

    return (
      <button
        class={`${styles.stat} ${opts.highlighted ? styles.highlighted : ''}`}
        onClick={opts.onClick ?? (() => {})}
        onMouseDown={opts.onMouseDown ?? (() => {})}
        onMouseUp={opts.onMouseUp ?? (() => {})}
        onTouchStart={opts.onTouchStart ?? (() => {})}
        onTouchEnd={opts.onTouchEnd ?? (() => {})}
        disabled={opts.disabled}
      >
        <div class={`${buttonTypeClasses[opts.type]}`}>
          <div class={styles.icon}></div>
          <div class={styles.statNumber}>{opts.label || ''}</div>
        </div>
      </button>
    );
  };

  return (
    <div class={styles.footer}>

      {actionButton({
        onClick: doReply,
        type: 'reply',
        highlighted: replied(),
        icon: replyEmpty,
        iconDisabled: replyFilled,
        label: replies(),
      })}

      <Show
        when={!isZapping()}
        fallback={
          actionButton({
            type: 'zap',
            highlighted: zapped(),
            disabled: true,
            icon: zapEmpty,
            iconDisabled: zapFilled,
            label: zaps() === 0 ? '' : truncateNumber(zaps()),
          })
        }
      >
        {actionButton({
          onMouseDown: startZap,
          onMouseUp: commitZap,
          onTouchStart: startZap,
          onTouchEnd: commitZap,
          type: 'zap',
          highlighted: zapped(),
          icon: zapEmpty,
          iconDisabled: zapFilled,
          label: zaps() === 0 ? '' : truncateNumber(zaps()),
        })}
      </Show>

      {actionButton({
        onClick: doLike,
        type: 'like',
        highlighted: liked(),
        icon: likeEmpty,
        iconDisabled: likeFilled,
        label: likes(),
      })}

      {actionButton({
        onClick: doRepost,
        type: 'repost',
        highlighted: reposted(),
        icon: repostEmpty,
        iconDisabled: repostFilled,
        label: reposts(),
      })}

      <CustomZap
        open={isCustomZap()}
        note={props.note}
        onSuccess={() => { setIsCustomZap(false); setIsZapping(false)}}
        onFail={() => { setIsCustomZap(false); setIsZapping(false)}}
      />

    </div>
  )
}

export default NoteFooter;
