import { Component, createEffect, createSignal, onMount, Show } from 'solid-js';
import { PrimalNote } from '../../../types/primal';
import { sendRepost } from '../../../lib/notes';

import styles from './NoteFooter.module.scss';
import { useAccountContext } from '../../../contexts/AccountContext';
import { useToastContext } from '../../Toaster/Toaster';
import { useIntl } from '@cookbook/solid-intl';

import { truncateNumber } from '../../../lib/notifications';
import { canUserReceiveZaps, zapNote } from '../../../lib/zap';
import CustomZap from '../../CustomZap/CustomZap';
import { useSettingsContext } from '../../../contexts/SettingsContext';

import zapSM from '../../../assets/lottie/zap_sm.json';
import zapMD from '../../../assets/lottie/zap_md.json';
import { medZapLimit } from '../../../constants';



const NoteFooter: Component<{ note: PrimalNote}> = (props) => {

  const account = useAccountContext();
  const toast = useToastContext();
  const intl = useIntl();
  const settings = useSettingsContext();

  const [liked, setLiked] = createSignal(props.note.post.noteActions.liked);
  const [zapped, setZapped] = createSignal(props.note.post.noteActions.zapped);
  const [replied, setReplied] = createSignal(props.note.post.noteActions.replied);
  const [reposted, setReposted] = createSignal(props.note.post.noteActions.reposted);

  const [likes, setLikes] = createSignal(props.note.post.likes);
  const [reposts, setReposts] = createSignal(props.note.post.reposts);
  const [replies, setReplies] = createSignal(props.note.post.replies);
  const [zaps, setZaps] = createSignal(props.note.post.satszapped);

  let footerDiv: HTMLDivElement | undefined;

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

    if (!account?.hasPublicKey() || !canUserReceiveZaps(props.note.user)) {
      return;
    }

    if (!isCustomZap()) {
      doQuickZap();
    }
  };

  const [zappedNow, setZappedNow] = createSignal(false);
  const [zappedAmount, setZappedAmount] = createSignal(0);

  const animateSmallZap = () => {
    setTimeout(() => {
      setHideZapIcon(true);

      const zapper = document.getElementById(`note-small-zap-${props.note.post.id}`);
      const player = document.getElementById(`note-small-zap-${props.note.post.id}`);

      if (!zapper || !player) {
        return;
      }

      const newLeft = 116;
      const newTop =  -8;

      zapper.style.left = `${newLeft}px`;
      zapper.style.top = `${newTop}px`;

      const onAnimDone = () => {
        // setIsZapping(true);
        setShowSmallZapAnim(false);
        setHideZapIcon(false);
        player?.removeEventListener('complete', onAnimDone);
      }

      player?.addEventListener('complete', onAnimDone);

      // @ts-ignore
      player?.seek(0);
      // @ts-ignore
      player?.play();
    }, 10);
  };

  const animateMedZap = () => {
    setTimeout(() => {
      setHideZapIcon(true);

      const zapper = document.getElementById(`note-med-zap-${props.note.post.id}`);
      const player = document.getElementById(`note-med-zap-${props.note.post.id}`);

      if (!zapper || !player) {
        return;
      }

      const newLeft = 20;
      const newTop = -35;

      zapper.style.left = `${newLeft}px`;
      zapper.style.top = `${newTop}px`;

      const onAnimDone = () => {
        // setIsZapping(true);
        setShowMedZapAnim(false);
        setHideZapIcon(false);
        player?.removeEventListener('complete', onAnimDone);
      }

      player?.addEventListener('complete', onAnimDone);

      // @ts-ignore
      player?.seek(0);
      // @ts-ignore
      player?.play();
    }, 10);
  };


  const animateZap = () => {
    if (zappedAmount() > medZapLimit) {
      setShowMedZapAnim(true);
      animateMedZap();
    }
    else {
      setShowSmallZapAnim(true);
      animateSmallZap();
    }

  }

  const doQuickZap = async () => {

    if (account?.hasPublicKey()) {
      setZappedAmount(() => settings?.defaultZapAmount || 0);
      setZappedNow(true);
      animateZap();
      const success = await zapNote(props.note, account.publicKey, settings?.defaultZapAmount || 10, '', account.relays);
      setIsZapping(false);

      if (success) {
        // toast?.sendSuccess(
        //   intl.formatMessage({
        //     id: 'toast.zapSuccess',
        //     defaultMessage: 'Zapped successfully',
        //     description: 'Toast message indicating successfull zap',
        //   }),
        // );
        return;
      }

        setZappedAmount(() => -(settings?.defaultZapAmount || 0));
        setZappedNow(true);
        setZapped(props.note.post.noteActions.zapped);

      //   setShowSmallZapAnim(false);
      //   setShowMedZapAnim(false);
      //   setHideZapIcon(false);

      // toast?.sendWarning(
      //   intl.formatMessage({
      //     id: 'toast.zapFail',
      //     defaultMessage: 'We were unable to send this Zap',
      //     description: 'Toast message indicating failed zap',
      //   }),
      // );
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
    label: string | number,
    hidden?: boolean,
  }) => {

    return (
      <button
        id={`btn_${opts.type}_${props.note.post.id}`}
        class={`${styles.stat} ${opts.highlighted ? styles.highlighted : ''}`}
        onClick={opts.onClick ?? (() => {})}
        onMouseDown={opts.onMouseDown ?? (() => {})}
        onMouseUp={opts.onMouseUp ?? (() => {})}
        onTouchStart={opts.onTouchStart ?? (() => {})}
        onTouchEnd={opts.onTouchEnd ?? (() => {})}
        disabled={opts.disabled}
      >
        <div class={`${buttonTypeClasses[opts.type]}`}>
          <div
            class={styles.icon}
            style={opts.hidden ? 'visibility: hidden': 'visibility: visible'}
          ></div>
          <div class={styles.statNumber}>{opts.label || ''}</div>
        </div>
      </button>
    );
  };

  createEffect(() => {

    if (zappedNow()) {
      setZaps((z) => z + zappedAmount());
      setZapped(true);
      setZappedNow(false);
    }

  })

  const [showSmallZapAnim, setShowSmallZapAnim] = createSignal(false);
  const [showMedZapAnim, setShowMedZapAnim] = createSignal(false);
  const [hideZapIcon, setHideZapIcon] = createSignal(false);

  return (
    <div class={styles.footer} ref={footerDiv}>
      <Show when={showSmallZapAnim()}>
        <lottie-player
          id={`note-small-zap-${props.note.post.id}`}
          src={zapSM}
          speed="1"
          class={styles.smallZapLottie}
        ></lottie-player>
      </Show>

      <Show when={showMedZapAnim()}>
        <lottie-player
          id={`note-med-zap-${props.note.post.id}`}
          src={zapMD}
          speed="1"
          class={styles.mediumZapLottie}
        ></lottie-player>
      </Show>

      {actionButton({
        onClick: doReply,
        type: 'reply',
        highlighted: replied(),
        label: replies(),
      })}

      {actionButton({
        onClick: (e: MouseEvent) => e.preventDefault(),
        onMouseDown: startZap,
        onMouseUp: commitZap,
        onTouchStart: startZap,
        onTouchEnd: commitZap,
        type: 'zap',
        highlighted: zapped() || isZapping(),
        label: zaps() === 0 ? '' : truncateNumber(zaps()),
        hidden: hideZapIcon(),
      })}

      {actionButton({
        onClick: doLike,
        type: 'like',
        highlighted: liked(),
        label: likes(),
      })}

      {actionButton({
        onClick: doRepost,
        type: 'repost',
        highlighted: reposted(),
        label: reposts(),
      })}

      <CustomZap
        open={isCustomZap()}
        note={props.note}
        onConfirm={(amount) => {
          setIsCustomZap(false);
          setZappedAmount(() => amount || 0);
          setZappedNow(true);
          setZapped(true);
          animateZap();
        }}
        onSuccess={(amount) => {
          setIsCustomZap(false);
          setIsZapping(false);
          // setZappedAmount(() => amount || 0);
          setZappedNow(false);
          // animateZap();
          setShowMedZapAnim(false);
          setShowSmallZapAnim(false);
          setHideZapIcon(false);
          setZapped(true);
        }}
        onFail={(amount) => {
          setZappedAmount(() => -(amount || 0));
          setZappedNow(true);
          setIsCustomZap(false);
          setIsZapping(false);
          setShowMedZapAnim(false);
          setShowSmallZapAnim(false);
          setHideZapIcon(false);
          setZapped(props.note.post.noteActions.zapped);
        }}
      />

    </div>
  )
}

export default NoteFooter;
