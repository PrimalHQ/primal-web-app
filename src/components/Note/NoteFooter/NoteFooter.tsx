import { Component, createSignal, onMount, Show } from 'solid-js';
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
import { createStore } from 'solid-js/store';

const NoteFooter: Component<{ note: PrimalNote}> = (props) => {

  const account = useAccountContext();
  const toast = useToastContext();
  const intl = useIntl();

  const liked = () => account?.likes.includes(props.note.post.id);

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
    }
  };

  const doZap = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    toast?.notImplemented();
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
    onClick: (e: MouseEvent) => void,
    icon: string,
    iconDisabled: string,
    label: string | number,
  }) => {

    const [activeIcon, setActiveIcon] = createSignal<string>(opts.icon);

    return (
      <Show
        when={opts.disabled}
        fallback={
          <button
            class={`${styles.stat} ${buttonTypeClasses[opts.type]}`}
            onClick={opts.onClick}
            onMouseOver={() => setActiveIcon(opts.iconDisabled)}
            onMouseOut={() => setActiveIcon(opts.icon)}
          >
            <img src={activeIcon()} />
            <div class={styles.statNumber}>{opts.label || ''}</div>
          </button>
        }
      >
        <button
          class={`${styles.stat} ${styles.disabled} ${buttonTypeClasses[opts.type]}`}
          onClick={() => {}}
        >
          <img src={opts.iconDisabled} />
          <span class={styles.statNumber}>{opts.label || ''}</span>
        </button>
      </Show>
    );
  };

  return (
    <div class={styles.footer}>

      {actionButton({
        onClick: doReply,
        type: 'reply',
        disabled: false,
        icon: replyEmpty,
        iconDisabled: replyFilled,
        label: replies(),
      })}

      {actionButton({
        onClick: doZap,
        type: 'zap',
        disabled: false,
        icon: zapEmpty,
        iconDisabled: zapFilled,
        label: zaps() === 0 ? '' : truncateNumber(zaps()),
      })}

      {actionButton({
        onClick: doLike,
        type: 'like',
        disabled: liked(),
        icon: likeEmpty,
        iconDisabled: likeFilled,
        label: likes(),
      })}

      {actionButton({
        onClick: doRepost,
        type: 'repost',
        disabled: false,
        icon: repostEmpty,
        iconDisabled: repostFilled,
        label: reposts(),
      })}
    </div>
  )
}

export default NoteFooter;
