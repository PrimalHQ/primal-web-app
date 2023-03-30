import { Component, createSignal } from 'solid-js';
import { PrimalNote } from '../../../types/primal';
import { sendRepost } from '../../../lib/notes';

import styles from './NoteFooter.module.scss';
import { useAccountContext } from '../../../contexts/AccountContext';
import { useToastContext } from '../../Toaster/Toaster';
import { useIntl } from '@cookbook/solid-intl';

const NoteFooter: Component<{ note: PrimalNote}> = (props) => {

  const account = useAccountContext();
  const toast = useToastContext();
  const intl = useIntl();

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

  const actionButton = (opts: {
    disabled?: boolean,
    onClick: (e: MouseEvent) => void,
    icon: string,
    label: string | number,
  }) => {
    return (
      <button
        class={styles.stat}
        onClick={opts.onClick}
        disabled={opts.disabled}
      >
        <div class={opts.icon}></div>
        <div class={styles.statNumber}>{opts.label || ''}</div>
      </button>
    );
  };

  return (
    <div class={styles.footer}>
      <div
        class={styles.stat}
        title={intl.formatMessage({
          id: 'tooltips.replyNumber',
          defaultMessage: 'Number of replies',
          description: 'Tooltip message for number of replies',
        })}
      >
        <div class={styles.replyIcon}></div>
        <div class={styles.statNumber}>{props.note.post?.replies || ''}</div>
      </div>

      {actionButton({
        onClick: doLike,
        disabled: liked(),
        icon: styles.likeIcon,
        label: likes(),
      })}

      {actionButton({
        onClick: doRepost,
        icon: styles.repostIcon,
        label: reposts(),
      })}

      {actionButton({
        onClick: doZap,
        icon: styles.zapIcon,
        label: props.note.post?.satszapped,
      })}
    </div>
  )
}

export default NoteFooter;
